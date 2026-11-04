import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { notifyFamily } from "./push.js";
import { syncEventToGoogle } from "./googleCalendarRoutes.js";

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

  // A handful of events may be tagged to several specific people (not just
  // one, not the whole family) — fetch all those tags in one query and
  // group them onto their events, rather than one query per event.
  const memberRows = await db
    .prepare(
      `SELECT em.event_id, em.member_id FROM event_members em
       INNER JOIN events e ON e.id = em.event_id
       WHERE e.family_id = ?`
    )
    .bind(familyId)
    .all();
  const memberIdsByEvent = {};
  for (const r of memberRows.results || []) {
    if (!memberIdsByEvent[r.event_id]) memberIdsByEvent[r.event_id] = [];
    memberIdsByEvent[r.event_id].push(r.member_id);
  }

  const results = (events.results || []).map((e) => ({ ...e, memberIds: memberIdsByEvent[e.id] || [] }));
  return json({ ok: true, events: results });
}

/** POST /api/events — create a new shared calendar event. */
export async function createEvent(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const title = (body.title || "").trim();
  const pillar = VALID_PILLARS.includes(body.pillar) ? body.pillar : null;
  const startsAt = body.startsAt;
  const endsAt = body.endsAt || null;
  const recurrence = Array.isArray(body.recurrence) ? body.recurrence : null;

  // memberIds is the preferred way in: [] = whole family (a group activity
  // everyone's tagged to), [one id] = that one person, [2+ ids] = those
  // specific people. The older single memberId is still accepted so nothing
  // that already calls this endpoint breaks.
  const memberIds = Array.isArray(body.memberIds)
    ? [...new Set(body.memberIds.filter(Boolean))]
    : body.memberId ? [body.memberId] : [];

  if (!validTitle(title)) return errorResponse(`Please enter a title (1-${MAX_TITLE_LENGTH} characters).`);
  if (!validDate(startsAt)) return errorResponse("Please provide a valid start date/time.");
  if (endsAt && !validDate(endsAt)) return errorResponse("End date/time isn't valid.");

  const db = env.DB;

  if (memberIds.length) {
    const placeholders = memberIds.map(() => "?").join(",");
    const found = await db
      .prepare(`SELECT id FROM members WHERE family_id = ? AND id IN (${placeholders})`)
      .bind(familyId, ...memberIds)
      .all();
    if ((found.results || []).length !== memberIds.length) {
      return errorResponse("One of those family members wasn't found.", 404);
    }
  }

  // A single tagged person still just goes on the row itself (matches
  // existing events, keeps the common case simple) — the join table is
  // only used for 2+ specific people. Whole-family (0 people) stays NULL.
  const soloMemberId = memberIds.length === 1 ? memberIds[0] : null;

  const eventId = newId();
  await db
    .prepare(
      "INSERT INTO events (id, family_id, member_id, title, pillar, starts_at, ends_at, recurrence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(eventId, familyId, soloMemberId, title, pillar, startsAt, endsAt, recurrence ? JSON.stringify(recurrence) : null)
    .run();

  if (memberIds.length >= 2) {
    for (const mId of memberIds) {
      await db.prepare("INSERT INTO event_members (event_id, member_id) VALUES (?, ?)").bind(eventId, mId).run();
    }
  }

  // Best-effort: let the rest of the family know. Awaited (Workers can cancel
  // un-awaited background work once the response is sent), but never breaks
  // the request if a notification fails to send.
  try {
    await notifyFamily(env, familyId, soloMemberId, {
      title: "New calendar event 📅",
      body: title,
    });
  } catch (err) {
    // ignore — notifications are best-effort
  }

  // Also best-effort: if this family has connected Google Calendar, mirror
  // the event there too. Never blocks or fails event creation if it errors.
  try {
    await syncEventToGoogle(env, familyId, { title, startsAt, endsAt });
  } catch (err) {
    // ignore — Google sync is best-effort
  }

  return json({
    ok: true,
    event: { id: eventId, memberId: soloMemberId, memberIds, title, pillar, startsAt, endsAt, recurrence },
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
