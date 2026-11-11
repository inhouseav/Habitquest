import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { resolveParentActor } from "../lib/parent.js";
import { ensureMealMember } from "../lib/schemaUpgrades.js";

// 🍽️ Family dinners — "kids pick, parent locks" (Maddie's choice).
//  - One dinner per night. Drag a recipe picture onto a free night to claim it.
//  - Each kid gets one dinner pick a week (dropping on another free night
//    moves their pick there). Taken nights say who picked them.
//  - A parent can swap any night, then 🔒 Lock the week: the dinners go
//    on the calendar as family events at 6 pm, and kids can't change them.
// Dinners are ordinary meal_plan_items rows (meal_type 'dinner',
// together = 1) plus a picked_by column, so the rest of the Food page
// (shopping list, recipe usage) keeps working.

let ready = false;
export async function ensureDinners(db) {
  if (ready) return true;
  try {
    await ensureMealMember(db);
    const cols = new Set(((await db.prepare("SELECT name FROM pragma_table_info('meal_plan_items')").all()).results || []).map((r) => r.name));
    if (!cols.has("picked_by")) await db.prepare("ALTER TABLE meal_plan_items ADD COLUMN picked_by TEXT").run().catch(() => {});
    await db.prepare(`CREATE TABLE IF NOT EXISTS meal_week_locks (
      family_id TEXT NOT NULL,
      week_of TEXT NOT NULL,
      locked_by TEXT,
      event_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (family_id, week_of)
    )`).run();
    const after = new Set(((await db.prepare("SELECT name FROM pragma_table_info('meal_plan_items')").all()).results || []).map((r) => r.name));
    ready = after.has("picked_by");
  } catch (err) {
    ready = false;
  }
  return ready;
}

const validDay = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
function addDays(day, n) {
  const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function mondayOf(day) {
  const d = new Date(day + "T00:00:00Z");
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}
async function lockFor(db, familyId, weekOf) {
  return db.prepare("SELECT week_of, locked_by, event_ids FROM meal_week_locks WHERE family_id = ? AND week_of = ?").bind(familyId, weekOf).first();
}

/** GET /api/dinners?start=YYYY-MM-DD&days=7|14 — dinners + which weeks are locked + how often each recipe is used. */
export async function listDinners(request, familyId, env) {
  const db = env.DB;
  if (!(await ensureDinners(db))) return errorResponse("Dinners aren't available right now.", 500);
  const url = new URL(request.url);
  const start = validDay(url.searchParams.get("start")) ? mondayOf(url.searchParams.get("start")) : mondayOf(new Date().toISOString().slice(0, 10));
  const days = Number(url.searchParams.get("days")) === 14 ? 14 : 7;
  const end = addDays(start, days - 1);
  const [items, locks, usage] = await Promise.all([
    db.prepare("SELECT id, day, recipe_id AS recipeId, title, picked_by AS pickedBy FROM meal_plan_items WHERE family_id = ? AND meal_type = 'dinner' AND day BETWEEN ? AND ? ORDER BY day ASC, created_at ASC").bind(familyId, start, end).all(),
    db.prepare("SELECT week_of AS weekOf, locked_by AS lockedBy FROM meal_week_locks WHERE family_id = ? AND week_of BETWEEN ? AND ?").bind(familyId, start, end).all(),
    db.prepare("SELECT recipe_id AS recipeId, COUNT(*) AS n FROM meal_plan_items WHERE family_id = ? AND recipe_id IS NOT NULL GROUP BY recipe_id").bind(familyId).all(),
  ]);
  return json({ ok: true, start, days, dinners: items.results || [], locks: locks.results || [], usage: usage.results || [] });
}

/**
 * POST /api/dinners/claim — { day, recipeId, memberId } put a recipe on a night.
 * Kids: free nights only, one pick a week (moves their earlier pick).
 * Parents (unlocked): any night, replaces what's there.
 */
export async function claimDinner(request, familyId, env) {
  const db = env.DB;
  if (!(await ensureDinners(db))) return errorResponse("Dinners aren't available right now.", 500);
  const body = (await readJson(request)) || {};
  if (!validDay(body.day)) return errorResponse("Which night?");
  const recipe = await db.prepare("SELECT id, title FROM recipes WHERE id = ? AND (family_id = ? OR family_id IS NULL)").bind(body.recipeId || "", familyId).first();
  if (!recipe) return errorResponse("Recipe not found.", 404);
  const member = await db.prepare("SELECT id, role, display_name FROM members WHERE id = ? AND family_id = ?").bind(body.memberId || "", familyId).first();
  if (!member) return errorResponse("Pick who you are first (👤 at the top).", 400);
  const parent = await resolveParentActor(db, request, familyId, member.id);
  const weekOf = mondayOf(body.day);
  if (!parent && (await lockFor(db, familyId, weekOf))) return errorResponse("🔒 This week's dinners are locked in by a parent.", 403);

  const taken = await db.prepare("SELECT id, title, picked_by FROM meal_plan_items WHERE family_id = ? AND meal_type = 'dinner' AND day = ?").bind(familyId, body.day).first();
  if (taken && !parent && taken.picked_by !== member.id) {
    const who = taken.picked_by ? await db.prepare("SELECT display_name FROM members WHERE id = ?").bind(taken.picked_by).first() : null;
    return json({ ok: false, taken: true, error: `That night's taken${who ? ` — ${who.display_name} picked ${taken.title}` : ` (${taken.title})`}. Pick another night!` }, 409);
  }

  let moved = null;
  if (!parent) {
    // One pick a week: move an earlier pick to this night.
    const mine = await db.prepare("SELECT id, day FROM meal_plan_items WHERE family_id = ? AND meal_type = 'dinner' AND picked_by = ? AND day BETWEEN ? AND ?")
      .bind(familyId, member.id, weekOf, addDays(weekOf, 6)).first();
    if (mine && mine.day !== body.day) { moved = mine.day; await db.prepare("DELETE FROM meal_plan_items WHERE id = ?").bind(mine.id).run(); }
  }
  if (taken) await db.prepare("DELETE FROM meal_plan_items WHERE id = ?").bind(taken.id).run();
  const id = newId();
  await db.prepare("INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, votes, together, meal_type, picked_by) VALUES (?, ?, ?, ?, ?, '[]', 1, 'dinner', ?)")
    .bind(id, familyId, body.day, recipe.id, recipe.title, member.id).run();
  return json({ ok: true, dinner: { id, day: body.day, recipeId: recipe.id, title: recipe.title, pickedBy: member.id }, replaced: taken ? taken.title : null, movedFrom: moved });
}

/** POST /api/dinners/unclaim — { day, memberId } take a dinner off a night (whoever picked it, or a parent). */
export async function unclaimDinner(request, familyId, env) {
  const db = env.DB;
  if (!(await ensureDinners(db))) return errorResponse("Dinners aren't available right now.", 500);
  const body = (await readJson(request)) || {};
  if (!validDay(body.day)) return errorResponse("Which night?");
  const item = await db.prepare("SELECT id, picked_by FROM meal_plan_items WHERE family_id = ? AND meal_type = 'dinner' AND day = ?").bind(familyId, body.day).first();
  if (!item) return json({ ok: true });
  const parent = await resolveParentActor(db, request, familyId, body.memberId);
  if (!parent) {
    if (await lockFor(db, familyId, mondayOf(body.day))) return errorResponse("🔒 This week's dinners are locked in by a parent.", 403);
    if (item.picked_by !== body.memberId) return errorResponse("Only whoever picked it (or a parent) can take it off.", 403);
  }
  await db.prepare("DELETE FROM meal_plan_items WHERE id = ?").bind(item.id).run();
  return json({ ok: true });
}

/**
 * POST /api/dinners/lock — { weekOf, actorId, tzOffset } parents only.
 * Puts each dinner on the calendar (whole family, 6–7 pm local) and locks the week.
 */
export async function lockWeek(request, familyId, env) {
  const db = env.DB;
  if (!(await ensureDinners(db))) return errorResponse("Dinners aren't available right now.", 500);
  const body = (await readJson(request)) || {};
  const parent = await resolveParentActor(db, request, familyId, body.actorId);
  if (!parent) return errorResponse("Only a parent can lock the week (parent PIN).", 403);
  const weekOf = mondayOf(validDay(body.weekOf) ? body.weekOf : new Date().toISOString().slice(0, 10));
  const tz = Number.isFinite(Number(body.tzOffset)) ? Number(body.tzOffset) : 0; // minutes, like Date#getTimezoneOffset
  await removeLockEvents(db, familyId, weekOf);
  const dinners = (await db.prepare("SELECT day, title FROM meal_plan_items WHERE family_id = ? AND meal_type = 'dinner' AND day BETWEEN ? AND ? ORDER BY day").bind(familyId, weekOf, addDays(weekOf, 6)).all()).results || [];
  const eventIds = [];
  const ops = [];
  for (const d of dinners) {
    const [y, m, dd] = d.day.split("-").map(Number);
    const startMs = Date.UTC(y, m - 1, dd, 18, 0) + tz * 60000;
    const id = newId(); eventIds.push(id);
    ops.push(db.prepare("INSERT INTO events (id, family_id, member_id, title, pillar, starts_at, ends_at, recurrence) VALUES (?, ?, NULL, ?, 'fuel', ?, ?, NULL)")
      .bind(id, familyId, `🍽️ ${d.title}`, new Date(startMs).toISOString(), new Date(startMs + 3600000).toISOString()));
  }
  ops.push(db.prepare("INSERT OR REPLACE INTO meal_week_locks (family_id, week_of, locked_by, event_ids) VALUES (?, ?, ?, ?)").bind(familyId, weekOf, parent.id, JSON.stringify(eventIds)));
  await db.batch(ops);
  return json({ ok: true, weekOf, events: eventIds.length });
}

async function removeLockEvents(db, familyId, weekOf) {
  const lock = await lockFor(db, familyId, weekOf);
  if (!lock) return;
  let ids = [];
  try { ids = JSON.parse(lock.event_ids || "[]"); } catch (err) { ids = []; }
  if (ids.length) await db.prepare(`DELETE FROM events WHERE family_id = ? AND id IN (${ids.map(() => "?").join(",")})`).bind(familyId, ...ids).run();
}

/** POST /api/dinners/unlock — { weekOf, actorId } parents only: unlock and take the dinners off the calendar. */
export async function unlockWeek(request, familyId, env) {
  const db = env.DB;
  if (!(await ensureDinners(db))) return errorResponse("Dinners aren't available right now.", 500);
  const body = (await readJson(request)) || {};
  const parent = await resolveParentActor(db, request, familyId, body.actorId);
  if (!parent) return errorResponse("Only a parent can unlock the week (parent PIN).", 403);
  const weekOf = mondayOf(validDay(body.weekOf) ? body.weekOf : new Date().toISOString().slice(0, 10));
  await removeLockEvents(db, familyId, weekOf);
  await db.prepare("DELETE FROM meal_week_locks WHERE family_id = ? AND week_of = ?").bind(familyId, weekOf).run();
  return json({ ok: true });
}
