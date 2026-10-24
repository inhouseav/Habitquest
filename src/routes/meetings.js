import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

const MAX_NOTES_LENGTH = 5000;

function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

/** GET /api/meetings?weekOf=YYYY-MM-DD — get (or know there isn't yet) this week's meeting notes. */
export async function getMeeting(request, familyId, env) {
  const url = new URL(request.url);
  const weekOf = url.searchParams.get("weekOf");
  if (!validDay(weekOf)) return errorResponse("weekOf must be formatted YYYY-MM-DD.");

  const db = env.DB;
  const meeting = await db
    .prepare("SELECT id, week_of, notes, created_at FROM family_meetings WHERE family_id = ? AND week_of = ?")
    .bind(familyId, weekOf)
    .first();

  return json({ ok: true, meeting: meeting || null });
}

/** POST /api/meetings — create or update this week's meeting notes (one per family per week). */
export async function saveMeeting(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const weekOf = body.weekOf;
  const notes = (body.notes || "").slice(0, MAX_NOTES_LENGTH);

  if (!validDay(weekOf)) return errorResponse("weekOf must be formatted YYYY-MM-DD.");

  const db = env.DB;
  const existing = await db
    .prepare("SELECT id FROM family_meetings WHERE family_id = ? AND week_of = ?")
    .bind(familyId, weekOf)
    .first();

  if (existing) {
    await db.prepare("UPDATE family_meetings SET notes = ? WHERE id = ?").bind(notes, existing.id).run();
    return json({ ok: true, meeting: { id: existing.id, weekOf, notes } });
  }

  const meetingId = newId();
  await db
    .prepare("INSERT INTO family_meetings (id, family_id, week_of, notes) VALUES (?, ?, ?, ?)")
    .bind(meetingId, familyId, weekOf, notes)
    .run();

  return json({ ok: true, meeting: { id: meetingId, weekOf, notes } });
}
