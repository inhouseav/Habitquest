import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { ensureBonusTables } from "../lib/schemaUpgrades.js";

const MAX_BONUS = 2;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

function addDaysStr(day, n) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Call after a habit completion is recorded. If this member has now ticked
 * off every one of their habits for `day` (i.e. "won the day"), advances
 * their streak — +1 if yesterday was also won, back to 1 if there's a gap.
 * Safe to call more than once for the same day (idempotent via last_won_day).
 */
async function maybeAdvanceStreak(db, memberId, day, completedCount, totalHabits) {
  if (totalHabits === 0 || completedCount < totalHabits) return null;

  const existing = await db
    .prepare("SELECT current_streak, longest_streak, last_won_day FROM habit_streaks WHERE member_id = ?")
    .bind(memberId)
    .first();
  if (existing && existing.last_won_day === day) {
    return { currentStreak: existing.current_streak, longestStreak: existing.longest_streak, justWon: false };
  }

  const yesterday = addDaysStr(day, -1);
  const newStreak = existing && existing.last_won_day === yesterday ? existing.current_streak + 1 : 1;
  const newLongest = Math.max(newStreak, existing ? existing.longest_streak : 0);

  if (existing) {
    await db
      .prepare("UPDATE habit_streaks SET current_streak = ?, longest_streak = ?, last_won_day = ? WHERE member_id = ?")
      .bind(newStreak, newLongest, day, memberId)
      .run();
  } else {
    await db
      .prepare("INSERT INTO habit_streaks (member_id, current_streak, longest_streak, last_won_day) VALUES (?, ?, ?, ?)")
      .bind(memberId, newStreak, newLongest, day)
      .run();
  }
  return { currentStreak: newStreak, longestStreak: newLongest, justWon: true };
}

/**
 * GET /api/habits?day=YYYY-MM-DD (defaults to today)
 * Returns, for every family member, their own 3 chosen weekly habits
 * (empty slots included so the UI can offer to fill them) and which are
 * ticked off for the given day.
 */
export async function getHabits(request, familyId, env) {
  const url = new URL(request.url);
  const day = url.searchParams.get("day") || todayStr();
  if (!validDay(day)) return errorResponse("day must be formatted YYYY-MM-DD.");

  const db = env.DB;
  const members = await db
    .prepare("SELECT id, display_name, role, color FROM members WHERE family_id = ? ORDER BY created_at ASC")
    .bind(familyId)
    .all();

  const habitsRes = await db
    .prepare("SELECT id, member_id, slot, title, emoji FROM weekly_habits WHERE family_id = ? ORDER BY member_id, slot")
    .bind(familyId)
    .all();

  const completionsRes = await db
    .prepare("SELECT habit_id FROM habit_completions WHERE family_id = ? AND day = ?")
    .bind(familyId, day)
    .all();
  const completedHabitIds = new Set((completionsRes.results || []).map((r) => r.habit_id));

  const streaksRes = await db
    .prepare(
      `SELECT hs.member_id, hs.current_streak, hs.longest_streak FROM habit_streaks hs
       INNER JOIN members m ON m.id = hs.member_id WHERE m.family_id = ?`
    )
    .bind(familyId)
    .all();
  const streakByMember = {};
  for (const s of streaksRes.results || []) streakByMember[s.member_id] = s;

  const habitsByMember = {};
  for (const h of habitsRes.results || []) {
    if (!habitsByMember[h.member_id]) habitsByMember[h.member_id] = [];
    habitsByMember[h.member_id].push({
      id: h.id,
      slot: h.slot,
      title: h.title,
      emoji: h.emoji || "",
      completed: completedHabitIds.has(h.id),
    });
  }

  // Bonus habits (optional extras). If the tables can't be set up, everyone
  // just has none — the 3 main habits are unaffected.
  const bonusByMember = {};
  if (await ensureBonusTables(db)) {
    const bonusRes = await db
      .prepare("SELECT id, member_id, slot, title, emoji FROM bonus_habits WHERE family_id = ? ORDER BY slot")
      .bind(familyId)
      .all();
    const bonusDone = await db
      .prepare("SELECT bonus_habit_id FROM bonus_completions WHERE family_id = ? AND day = ?")
      .bind(familyId, day)
      .all();
    const bonusDoneIds = new Set((bonusDone.results || []).map((r) => r.bonus_habit_id));
    for (const b of bonusRes.results || []) {
      if (!bonusByMember[b.member_id]) bonusByMember[b.member_id] = [];
      bonusByMember[b.member_id].push({ id: b.id, slot: b.slot, title: b.title, emoji: b.emoji || "", completed: bonusDoneIds.has(b.id) });
    }
  }

  const result = (members.results || []).map((m) => {
    const habits = (habitsByMember[m.id] || []).sort((a, b) => a.slot - b.slot);
    const completedCount = habits.filter((h) => h.completed).length;
    const streak = streakByMember[m.id];
    return {
      memberId: m.id,
      displayName: m.display_name,
      role: m.role,
      color: m.color,
      habits,
      completedCount,
      totalHabits: habits.length,
      currentStreak: streak ? streak.current_streak : 0,
      longestStreak: streak ? streak.longest_streak : 0,
      dayWon: habits.length > 0 && completedCount === habits.length,
      bonusHabits: bonusByMember[m.id] || [],
    };
  });

  return json({ ok: true, day, members: result });
}

/**
 * GET /api/habits/completions — every habit completion ever logged, with
 * just enough info (day, who, title, emoji) to draw small markers on the
 * calendar. Mirrors the "/api/events" pattern: unscoped by date range,
 * fetched once by the frontend and cached (family-sized datasets stay
 * small, so this is fine without pagination for now).
 */
export async function listCompletions(familyId, env) {
  const db = env.DB;
  const rows = await db
    .prepare(
      `SELECT hc.day, hc.member_id as memberId, wh.title, wh.emoji
       FROM habit_completions hc
       JOIN weekly_habits wh ON wh.id = hc.habit_id
       WHERE hc.family_id = ?
       ORDER BY hc.day ASC`
    )
    .bind(familyId)
    .all();
  return json({ ok: true, completions: rows.results || [] });
}

/**
 * POST /api/habits/set — replace one member's 3 weekly habits.
 * Body: { memberId, habits: [{ slot: 1-3, title, emoji? }, ...] }
 * Any slot left out is cleared. This is the simple editor for now; the
 * guided Weekly Family Check-in (later) will write to the same table.
 */
export async function setHabits(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const memberId = body.memberId;
  const habits = Array.isArray(body.habits) ? body.habits : [];
  if (!memberId) return errorResponse("memberId is required.");
  if (habits.length > 3) return errorResponse("A member can have at most 3 weekly habits.");

  const db = env.DB;
  const member = await db
    .prepare("SELECT id FROM members WHERE id = ? AND family_id = ?")
    .bind(memberId, familyId)
    .first();
  if (!member) return errorResponse("Family member not found.", 404);

  const seenSlots = new Set();
  for (const h of habits) {
    if (![1, 2, 3].includes(h.slot)) return errorResponse("Each habit needs a slot of 1, 2, or 3.");
    if (seenSlots.has(h.slot)) return errorResponse("Each slot (1-3) can only be used once.");
    seenSlots.add(h.slot);
    if (!h.title || !String(h.title).trim()) return errorResponse("Each habit needs a title.");
  }

  // Bonus habits are optional and only touched if the request includes them.
  const bonus = Array.isArray(body.bonus) ? body.bonus : null;
  if (bonus) {
    if (bonus.length > MAX_BONUS) return errorResponse(`You can have up to ${MAX_BONUS} bonus habits.`);
    const seenBonus = new Set();
    for (const b of bonus) {
      if (![4, 5].includes(b.slot)) return errorResponse("Bonus habits use slots 4 and 5.");
      if (seenBonus.has(b.slot)) return errorResponse("Each bonus slot can only be used once.");
      seenBonus.add(b.slot);
      if (!b.title || !String(b.title).trim()) return errorResponse("Each bonus habit needs a title.");
    }
  }

  // Update each slot in place, so editing a habit's name doesn't wipe the
  // ticks (and calendar dots) already earned on it this week. A slot that's
  // been cleared is removed; a new one is added.
  const existingRes = await db.prepare("SELECT id, slot FROM weekly_habits WHERE member_id = ?").bind(memberId).all();
  const existingBySlot = {};
  for (const r of existingRes.results || []) existingBySlot[r.slot] = r.id;
  const wanted = {};
  for (const h of habits) wanted[h.slot] = h;
  for (const slot of [1, 2, 3]) {
    const h = wanted[slot];
    const title = h ? String(h.title).trim().slice(0, 80) : null;
    const emoji = h ? (h.emoji || "").slice(0, 8) : null;
    if (h && existingBySlot[slot]) {
      await db.prepare("UPDATE weekly_habits SET title = ?, emoji = ? WHERE id = ?").bind(title, emoji, existingBySlot[slot]).run();
    } else if (h) {
      await db.prepare("INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(newId(), familyId, memberId, slot, title, emoji).run();
    } else if (existingBySlot[slot]) {
      await db.prepare("DELETE FROM weekly_habits WHERE id = ?").bind(existingBySlot[slot]).run();
    }
  }

  if (bonus && (await ensureBonusTables(db))) {
    const exBonus = await db.prepare("SELECT id, slot FROM bonus_habits WHERE member_id = ?").bind(memberId).all();
    const exBySlot = {};
    for (const r of exBonus.results || []) exBySlot[r.slot] = r.id;
    const wantedBonus = {};
    for (const b of bonus) wantedBonus[b.slot] = b;
    for (const slot of [4, 5]) {
      const b = wantedBonus[slot];
      const title = b ? String(b.title).trim().slice(0, 80) : null;
      const emoji = b ? (b.emoji || "").slice(0, 8) : null;
      if (b && exBySlot[slot]) {
        await db.prepare("UPDATE bonus_habits SET title = ?, emoji = ? WHERE id = ?").bind(title, emoji, exBySlot[slot]).run();
      } else if (b) {
        await db.prepare("INSERT INTO bonus_habits (id, family_id, member_id, slot, title, emoji) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(newId(), familyId, memberId, slot, title, emoji).run();
      } else if (exBySlot[slot]) {
        await db.prepare("DELETE FROM bonus_habits WHERE id = ?").bind(exBySlot[slot]).run();
      }
    }
  }

  return json({ ok: true });
}

/**
 * POST /api/habits/:id/complete — tick one habit off for a day. Awards
 * exactly 1 star, protected by the (habit, day) unique constraint so it
 * can never be double-awarded even on a double click or retry.
 * Body: { day? }
 */
export async function completeHabit(habitId, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const day = body.day && validDay(body.day) ? body.day : todayStr();

  const db = env.DB;
  const habit = await db
    .prepare("SELECT id, member_id, title FROM weekly_habits WHERE id = ? AND family_id = ?")
    .bind(habitId, familyId)
    .first();
  if (!habit) return errorResponse("Habit not found.", 404);

  const already = await db
    .prepare("SELECT id FROM habit_completions WHERE habit_id = ? AND day = ?")
    .bind(habitId, day)
    .first();
  if (already) {
    return errorResponse("Already ticked off for today.", 409);
  }

  const idempotencyKey = `habit:${habitId}:${day}`;
  const ledgerId = newId();
  try {
    await db
      .prepare(
        "INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES (?, ?, ?, 1, ?, ?)"
      )
      .bind(ledgerId, familyId, habit.member_id, `Did "${habit.title}" on ${day}`, idempotencyKey)
      .run();
  } catch (err) {
    if (String(err.message || err).includes("UNIQUE")) {
      return errorResponse("Already ticked off for today.", 409);
    }
    throw err;
  }

  const completionId = newId();
  await db
    .prepare(
      "INSERT INTO habit_completions (id, habit_id, member_id, family_id, day, star_ledger_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(completionId, habitId, habit.member_id, familyId, day, ledgerId)
    .run();

  const allToday = await db
    .prepare(
      "SELECT hc.habit_id FROM habit_completions hc WHERE hc.member_id = ? AND hc.day = ?"
    )
    .bind(habit.member_id, day)
    .all();
  const totalHabits = await db
    .prepare("SELECT COUNT(*) as n FROM weekly_habits WHERE member_id = ?")
    .bind(habit.member_id)
    .first();

  const completedCount = (allToday.results || []).length;
  const totalCount = totalHabits ? totalHabits.n : 0;
  const streakResult = await maybeAdvanceStreak(db, habit.member_id, day, completedCount, totalCount);

  return json({
    ok: true,
    completionId,
    day,
    completedCount,
    totalHabits: totalCount,
    dayWon: completedCount === totalCount && totalCount > 0,
    justWonStreak: !!(streakResult && streakResult.justWon),
    currentStreak: streakResult ? streakResult.currentStreak : null,
  });
}

/**
 * POST /api/habits/bonus/:id/complete — { day } -> ticks off a bonus habit.
 * Earns a star like any habit, but never affects winning the day / streaks.
 */
export async function completeBonusHabit(bonusId, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const day = body.day && validDay(body.day) ? body.day : todayStr();
  const db = env.DB;
  if (!(await ensureBonusTables(db))) return errorResponse("Bonus habits aren't available right now.", 500);

  const habit = await db
    .prepare("SELECT id, member_id, title FROM bonus_habits WHERE id = ? AND family_id = ?")
    .bind(bonusId, familyId)
    .first();
  if (!habit) return errorResponse("Habit not found.", 404);

  const already = await db.prepare("SELECT id FROM bonus_completions WHERE bonus_habit_id = ? AND day = ?").bind(bonusId, day).first();
  if (already) return errorResponse("Already ticked off for today.", 409);

  const ledgerId = newId();
  try {
    await db
      .prepare("INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES (?, ?, ?, 1, ?, ?)")
      .bind(ledgerId, familyId, habit.member_id, `Bonus: "${habit.title}" on ${day}`, `bonus:${bonusId}:${day}`)
      .run();
  } catch (err) {
    if (String(err.message || err).includes("UNIQUE")) return errorResponse("Already ticked off for today.", 409);
    throw err;
  }
  await db
    .prepare("INSERT INTO bonus_completions (id, bonus_habit_id, member_id, family_id, day, star_ledger_id) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(newId(), bonusId, habit.member_id, familyId, day, ledgerId)
    .run();
  return json({ ok: true, day });
}
