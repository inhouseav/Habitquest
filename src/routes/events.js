import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { notifyFamily } from "./push.js";

const VALID_PILLARS = ["fuel", "move", "grow"];
const MAX_TITLE_LENGTH = 100;

function validTitle(title) {
  return typeof title === "string" && title.trim().length > 0 && title.trim().length <= MAX_TITLE_LENGTH;
}

function validDate(value) {
  if (typeof value !== "string") return false;
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

/** GET /api/events — list this family's shared calendar events. */
export async function listEvents(familyId, env) {
  const db = env.DB;
  const events = await db
    .prepare(
      "SELECT id, member_id, title, pillar, starts_at, ends_at, recurrence, created_at FROM events WHERE family_id = ? ORDER BY starts_at ASC"
    )
    .bind(familyId)
    .all();
  return json({ ok: true, events: events.results || [] });
}

/** POST /api/events — create a new shared calendar event. */
export async function createEvent(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const title = (body.title || "").trim();
  const pillar = VALID_PILLARS.includes(body.pillar) ? body.pillar : null;
  const startsAt = body.startsAt;
  const endsAt = body.endsAt || null;
  const memberId = body.memberId || null;
  const recurrence = Array.isArray(body.recurrence) ? body.recurrence : null;

  if (!validTitle(title)) return errorResponse(`Please enter a title (1-${MAX_TITLE_LENGTH} characters).`);
  if (!validDate(startsAt)) return errorResponse("Please provide a valid start date/time.");
  if (endsAt && !validDate(endsAt)) return errorResponse("End date/time isn't valid.");

  const db = env.DB;

  if (memberId) {
    const member = await db
      .prepare("SELECT id FROM members WHERE id = ? AND family_id = ?")
      .bind(memberId, familyId)
      .first();
    if (!member) return errorResponse("That family member wasn't found.", 404);
  }

  const eventId = newId();
  await db
    .prepare(
      "INSERT INTO events (id, family_id, member_id, title, pillar, starts_at, ends_at, recurrence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(eventId, familyId, memberId, title, pillar, startsAt, endsAt, recurrence ? JSON.stringify(recurrence) : null)
    .run();

  // Best-effort: let the rest of the family know. Awaited (Workers can cancel
  // un-awaited background work once the response is sent), but never breaks
  // the request if a notification fails to send.
  try {
    await notifyFamily(env, familyId, memberId, {
      title: "New calendar event 📅",
      body: title,
    });
  } catch (err) {
    // ignore — notifications are best-effort
  }

  return json({
    ok: true,
    event: { id: eventId, memberId, title, pillar, startsAt, endsAt, recurrence },
  });
}

/** DELETE /api/events/:id — remove an event (must belong to this family). */
export async function deleteEvent(eventId, familyId, env) {
  const db = env.DB;
  const existing = await db
    .prepare("SELECT id FROM events WHERE id = ? AND family_id = ?")
    .bind(eventId, familyId)
    .first();
  if (!existing) return errorResponse("Event not found.", 404);

  await db.prepare("DELETE FROM events WHERE id = ?").bind(eventId).run();
  return json({ ok: true });
}
