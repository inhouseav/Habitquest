import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { resolveParentActor } from "../lib/parent.js";
import { awardOnce, mondayOf, addDays, starsThisWeek, isTickableDay } from "../lib/points.js";

// 🥕 Food Explorer Passport — "Try new foods" from the Project Bible.
// Every new food you try gets a stamp (and how it was: loved it / it's OK /
// not yet — trying is what counts, so every answer earns the stamp).
//
// Bonus ⭐ rules, so it can't be farmed:
//  - each food stamps once per person (trying it again just updates the verdict)
//  - at most 1 food star a day (key food:<member>:<day>)
//  - at most FOOD_STARS_PER_WEEK food stars in a Mon–Sun week
//  - only for today (± time zones), like habit ticks

export const FOOD_STARS_PER_WEEK = 3;
const VERDICTS = ["love", "ok", "not_yet"];
let ready = false;

export async function ensureFoodPassport(db) {
  if (ready) return true;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS food_passport (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      food_key TEXT NOT NULL,
      food_name TEXT NOT NULL,
      emoji TEXT,
      verdict TEXT NOT NULL DEFAULT 'ok',
      day TEXT NOT NULL,
      starred INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(member_id, food_key)
    )`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS food_wishlist (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      food_key TEXT NOT NULL,
      food_name TEXT NOT NULL,
      emoji TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(member_id, food_key)
    )`).run();
    ready = true;
  } catch (err) {
    ready = false;
  }
  return ready;
}

function validDay(day) { return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day); }
function foodKey(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function weekDays(day) { const m = mondayOf(day); return Array.from({ length: 7 }, (_, i) => addDays(m, i)); }

async function foodStarsThisWeek(db, memberId, day) {
  const keys = weekDays(day).map((d) => `food:${memberId}:${d}`);
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM star_ledger WHERE idempotency_key IN (${keys.map(() => "?").join(",")})`).bind(...keys).first();
  return row ? row.n : 0;
}

/** GET /api/food-passport?day=YYYY-MM-DD — everyone's stamps + today's bonus status. */
export async function getFoodPassport(request, familyId, env) {
  const db = env.DB;
  if (!(await ensureFoodPassport(db))) return errorResponse("The food passport isn't available right now.", 500);
  const url = new URL(request.url);
  const day = validDay(url.searchParams.get("day")) ? url.searchParams.get("day") : new Date().toISOString().slice(0, 10);
  const [membersRes, stampsRes, wishRes] = await Promise.all([
    db.prepare("SELECT id, display_name FROM members WHERE family_id = ? ORDER BY created_at ASC").bind(familyId).all(),
    db.prepare("SELECT id, member_id, food_name, emoji, verdict, day, starred FROM food_passport WHERE family_id = ? ORDER BY created_at ASC").bind(familyId).all(),
    db.prepare("SELECT id, member_id, food_name, emoji FROM food_wishlist WHERE family_id = ? ORDER BY created_at ASC").bind(familyId).all(),
  ]);
  const stamps = stampsRes.results || [];
  const wishes = wishRes.results || [];
  const members = await Promise.all((membersRes.results || []).map(async (m) => {
    const [todayRow, weekCount] = await Promise.all([
      db.prepare("SELECT id FROM star_ledger WHERE idempotency_key = ?").bind(`food:${m.id}:${day}`).first(),
      foodStarsThisWeek(db, m.id, day),
    ]);
    const mine = stamps.filter((s) => s.member_id === m.id).map((s) => ({ id: s.id, food: s.food_name, emoji: s.emoji, verdict: s.verdict, day: s.day, starred: !!s.starred }));
    return {
      memberId: m.id,
      name: m.display_name,
      stamps: mine,
      toTry: wishes.filter((w) => w.member_id === m.id).map((w) => ({ id: w.id, food: w.food_name, emoji: w.emoji })),
      count: mine.length,
      starToday: !!todayRow,
      foodStarsThisWeek: weekCount,
    };
  }));
  return json({ members, starsPerWeek: FOOD_STARS_PER_WEEK });
}

/** POST /api/food-passport/try — { memberId, food, emoji?, verdict, day } stamp a food. */
export async function tryFood(request, familyId, env) {
  const db = env.DB;
  if (!(await ensureFoodPassport(db))) return errorResponse("The food passport isn't available right now.", 500);
  const body = (await readJson(request)) || {};
  const day = validDay(body.day) ? body.day : new Date().toISOString().slice(0, 10);
  if (!isTickableDay(day)) return errorResponse("You can only stamp foods you try today.", 400);
  const name = String(body.food || "").trim().slice(0, 40);
  const key = foodKey(name);
  if (!key) return errorResponse("What food did you try?");
  const verdict = VERDICTS.includes(body.verdict) ? body.verdict : "ok";
  const emoji = String(body.emoji || "🍽️").slice(0, 8);
  const member = await db.prepare("SELECT id FROM members WHERE id = ? AND family_id = ?").bind(body.memberId || "", familyId).first();
  if (!member) return errorResponse("Family member not found.", 404);

  // Tried it — it's off the "want to try" list.
  await db.prepare("DELETE FROM food_wishlist WHERE member_id = ? AND food_key = ?").bind(member.id, key).run();
  const existing = await db.prepare("SELECT id FROM food_passport WHERE member_id = ? AND food_key = ?").bind(member.id, key).first();
  if (existing) {
    await db.prepare("UPDATE food_passport SET verdict = ? WHERE id = ?").bind(verdict, existing.id).run();
    return json({ ok: true, alreadyHad: true, star: false, reason: "already" });
  }
  const id = newId();
  try {
    await db.prepare("INSERT INTO food_passport (id, family_id, member_id, food_key, food_name, emoji, verdict, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, familyId, member.id, key, name, emoji, verdict, day).run();
  } catch (err) {
    if (String(err.message || err).includes("UNIQUE")) return json({ ok: true, alreadyHad: true, star: false, reason: "already" });
    throw err;
  }

  // Bonus star: once a day, and only a few a week.
  let star = false;
  let reason = "";
  if ((await foodStarsThisWeek(db, member.id, day)) >= FOOD_STARS_PER_WEEK) {
    reason = "week";
  } else {
    star = await awardOnce(db, { familyId, memberId: member.id, delta: 1, reason: `Tried a new food: ${name}`, key: `food:${member.id}:${day}`, newId });
    if (!star) reason = "today";
  }
  if (star) await db.prepare("UPDATE food_passport SET starred = 1 WHERE id = ?").bind(id).run();
  const [count, weekStars] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM food_passport WHERE member_id = ?").bind(member.id).first(),
    starsThisWeek(db, member.id, day),
  ]);
  return json({ ok: true, alreadyHad: false, star, reason, count: count ? count.n : 1, starsThisWeek: weekStars });
}

/**
 * POST /api/food-passport/wish — { memberId, food, emoji? } "I want to try
 * this": goes on their passport's 🛒 To try list and the shopping list.
 */
export async function wishFood(request, familyId, env) {
  const db = env.DB;
  if (!(await ensureFoodPassport(db))) return errorResponse("The food passport isn't available right now.", 500);
  const body = (await readJson(request)) || {};
  const name = String(body.food || "").trim().slice(0, 40);
  const key = foodKey(name);
  if (!key) return errorResponse("What food do you want to try?");
  const member = await db.prepare("SELECT id, display_name FROM members WHERE id = ? AND family_id = ?").bind(body.memberId || "", familyId).first();
  if (!member) return errorResponse("Family member not found.", 404);
  const emoji = String(body.emoji || "🍽️").slice(0, 8);
  await db.prepare("INSERT OR IGNORE INTO food_wishlist (id, family_id, member_id, food_key, food_name, emoji) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(newId(), familyId, member.id, key, name, emoji).run();
  // On the shopping list too (once), so it's bought this week.
  const shopName = `${name} (for ${member.display_name} to try)`;
  const onList = await db.prepare("SELECT id FROM shopping_items WHERE family_id = ? AND lower(name) LIKE ?").bind(familyId, `${name.toLowerCase()}%`).first();
  if (!onList) await db.prepare("INSERT INTO shopping_items (id, family_id, name) VALUES (?, ?, ?)").bind(newId(), familyId, shopName).run();
  return json({ ok: true, addedToShopping: !onList });
}

/** DELETE /api/food-passport/wish/:id — take a food off the To try list. */
export async function unwishFood(id, familyId, env) {
  const db = env.DB;
  if (!(await ensureFoodPassport(db))) return errorResponse("The food passport isn't available right now.", 500);
  await db.prepare("DELETE FROM food_wishlist WHERE id = ? AND family_id = ?").bind(id, familyId).run();
  return json({ ok: true });
}

/** DELETE /api/food-passport/:id — parents only (fixing a mistake). The star, if any, stays given. */
export async function deleteFoodStamp(id, request, familyId, env) {
  const db = env.DB;
  if (!(await ensureFoodPassport(db))) return errorResponse("The food passport isn't available right now.", 500);
  const body = (await readJson(request)) || {};
  const parent = await resolveParentActor(db, request, familyId, body.actorMemberId);
  if (!parent) return errorResponse("Only a parent can remove a stamp.", 403);
  await db.prepare("DELETE FROM food_passport WHERE id = ? AND family_id = ?").bind(id, familyId).run();
  return json({ ok: true });
}
