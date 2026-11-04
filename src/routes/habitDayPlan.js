import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

/** GET /api/habit-day-plan?startDay=YYYY-MM-DD&endDay=YYYY-MM-DD — this week's planned days per habit. */
export async function listHabitDayPlan(request, familyId, env) {
  const url = new URL(request.url);
  const startDay = url.searchParams.get("startDay");
  const endDay = url.searchParams.get("endDay");
  if (!validDay(startDay) || !validDay(endDay)) {
    return errorResponse("startDay and endDay must be formatted YYYY-MM-DD.");
  }

  const rows = await env.DB.prepare(
    "SELECT id, member_id as memberId, slot, day FROM habit_day_plan WHERE family_id = ? AND day BETWEEN ? AND ? ORDER BY day ASC"
  )
    .bind(familyId, startDay, endDay)
    .all();

  return json({ ok: true, items: rows.results || [] });
}

/** POST /api/habit-day-plan — plan one of a member's 3 habits onto a specific day. */
export async function addHabitDayPlan(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");
  const { memberId, slot, day } = body;
  if (!memberId || ![1, 2, 3].includes(slot)) return errorResponse("Please pick a habit.");
  if (!validDay(day)) return errorResponse("day must be formatted YYYY-MM-DD.");

  const db = env.DB;
  const member = await db.prepare("SELECT id FROM members WHERE id = ? AND family_id = ?").bind(memberId, familyId).first();
  if (!member) return errorResponse("Family member not found.", 404);
  const habit = await db.prepare("SELECT id FROM weekly_habits WHERE member_id = ? AND slot = ?").bind(memberId, slot).first();
  if (!habit) return errorResponse("That habit hasn't been set yet.");

  const existing = await db.prepare("SELECT id FROM habit_day_plan WHERE member_id = ? AND slot = ? AND day = ?").bind(memberId, slot, day).first();
  if (existing) return json({ ok: true, item: { id: existing.id, memberId, slot, day } });

  const id = newId();
  await db.prepare("INSERT INTO habit_day_plan (id, family_id, member_id, slot, day) VALUES (?, ?, ?, ?, ?)")
    .bind(id, familyId, memberId, slot, day)
    .run();
  return json({ ok: true, item: { id, memberId, slot, day } });
}

/** DELETE /api/habit-day-plan/:id — unplan a habit from a day. */
export async function deleteHabitDayPlan(id, familyId, env) {
  const db = env.DB;
  const existing = await db.prepare("SELECT id FROM habit_day_plan WHERE id = ? AND family_id = ?").bind(id, familyId).first();
  if (!existing) return errorResponse("Not found.", 404);
  await db.prepare("DELETE FROM habit_day_plan WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
