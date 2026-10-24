import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
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

  const result = (members.results || []).map((m) => {
    const habits = (habitsByMember[m.id] || []).sort((a, b) => a.slot - b.slot);
    const completedCount = habits.filter((h) => h.completed).length;
    return {
      memberId: m.id,
      displayName: m.display_name,
      role: m.role,
      color: m.color,
      habits,
      completedCount,
      totalHabits: habits.length,
    };
  });

  return json({ ok: true, day, members: result });
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

  // Clear this member's existing habits, then insert the new set.
  // (Completions referencing old habit ids are cascaded away by the FK.)
  await db.prepare("DELETE FROM weekly_habits WHERE member_id = ?").bind(memberId).run();

  for (const h of habits) {
    const id = newId();
    await db
      .prepare("INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, familyId, memberId, h.slot, String(h.title).trim().slice(0, 80), (h.emoji || "").slice(0, 8))
      .run();
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

  return json({
    ok: true,
    completionId,
    day,
    completedCount: (allToday.results || []).length,
    totalHabits: totalHabits ? totalHabits.n : 0,
  });
}
