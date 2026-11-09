import { json, errorResponse } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { buildAuthUrl, exchangeCodeForTokens, refreshAccessToken, pushEventToGoogle, listEventsFromGoogle } from "../lib/googleCalendar.js";

function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

function redirectUriFor(url) {
  // Must exactly match what's registered in the Google Cloud Console.
  return `${url.origin}/api/calendar/google/callback`;
}

/** GET /api/calendar/google/status — is this family connected? */
export async function status(familyId, env) {
  const row = await env.DB.prepare("SELECT family_id FROM google_calendar_connections WHERE family_id = ?")
    .bind(familyId)
    .first();
  return json({ ok: true, connected: !!row, configured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) });
}

/** GET /api/calendar/google/start — kicks off the OAuth flow; redirects to Google. */
export async function start(familyId, env, url) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return htmlResult(`Google Calendar isn't switched on for this app yet, so there's nothing to connect to. The app's own calendar works fine without it.`);
  }
  const state = newId();
  await env.DB.prepare("INSERT INTO google_oauth_states (state, family_id) VALUES (?, ?)")
    .bind(state, familyId)
    .run();
  const redirectUri = redirectUriFor(url);
  const authUrl = buildAuthUrl(env, redirectUri, state);
  return Response.redirect(authUrl, 302);
}

/** GET /api/calendar/google/callback — public (Google redirects here with no session). */
export async function callback(request, env, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return htmlResult(`Google said: ${errorParam}. You can close this tab and try again.`);
  }
  if (!code || !state) return htmlResult("Missing code or state from Google. You can close this tab and try again.");

  const db = env.DB;
  const stateRow = await db.prepare("SELECT family_id FROM google_oauth_states WHERE state = ?").bind(state).first();
  if (!stateRow) return htmlResult("This connection link already expired. Go back to the app and try again.");
  await db.prepare("DELETE FROM google_oauth_states WHERE state = ?").bind(state).run();

  try {
    const redirectUri = redirectUriFor(url);
    const tokens = await exchangeCodeForTokens(env, code, redirectUri);
    if (!tokens.refresh_token) {
      return htmlResult(
        "Google didn't give us a long-term connection (this can happen if you'd already connected before). Go back to the app, disconnect, and try connecting again."
      );
    }
    const existing = await db
      .prepare("SELECT family_id FROM google_calendar_connections WHERE family_id = ?")
      .bind(stateRow.family_id)
      .first();
    if (existing) {
      await db
        .prepare("UPDATE google_calendar_connections SET refresh_token = ? WHERE family_id = ?")
        .bind(tokens.refresh_token, stateRow.family_id)
        .run();
    } else {
      await db
        .prepare("INSERT INTO google_calendar_connections (family_id, refresh_token) VALUES (?, ?)")
        .bind(stateRow.family_id, tokens.refresh_token)
        .run();
    }
    return htmlResult("Google Calendar is connected! You can close this tab and go back to Fuel the Fun.", true);
  } catch (err) {
    return htmlResult(`Something went wrong connecting: ${err.message}`);
  }
}

function htmlResult(message, success = false) {
  return new Response(
    `<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:60px auto;text-align:center;">
      <h2>${success ? "✅ Connected!" : "Hmm, that didn't work"}</h2>
      <p>${message}</p>
      <p><a href="/">← Back to the app</a></p>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

/** POST /api/calendar/google/disconnect */
export async function disconnect(familyId, env) {
  await env.DB.prepare("DELETE FROM google_calendar_connections WHERE family_id = ?").bind(familyId).run();
  return json({ ok: true });
}

/**
 * GET /api/calendar/google/today-items?day=&memberId= — today's Google
 * Calendar events (family-wide calendar), with a `completed` flag for
 * whichever member you pass, so they can show as bonus tickable items
 * alongside that person's 3 typed habits. Returns connected:false (not an
 * error) when Google Calendar isn't connected — nothing to show, not a
 * problem.
 */
export async function todayItems(request, familyId, env) {
  const url = new URL(request.url);
  const day = url.searchParams.get("day") || new Date().toISOString().slice(0, 10);
  const memberId = url.searchParams.get("memberId");
  if (!validDay(day)) return errorResponse("day must be formatted YYYY-MM-DD.");
  if (!memberId) return errorResponse("memberId is required.");

  const db = env.DB;
  const conn = await db
    .prepare("SELECT refresh_token, google_calendar_id FROM google_calendar_connections WHERE family_id = ?")
    .bind(familyId)
    .first();
  if (!conn) return json({ ok: true, connected: false, items: [] });

  let items;
  try {
    const accessToken = await refreshAccessToken(env, conn.refresh_token);
    items = await listEventsFromGoogle(accessToken, conn.google_calendar_id, day);
  } catch (err) {
    // Best-effort — a Google hiccup shouldn't break the habits card.
    return json({ ok: true, connected: true, items: [], error: err.message });
  }

  const completedRes = await db
    .prepare("SELECT google_event_id FROM calendar_item_completions WHERE member_id = ? AND day = ?")
    .bind(memberId, day)
    .all();
  const completedIds = new Set((completedRes.results || []).map((r) => r.google_event_id));

  return json({
    ok: true,
    connected: true,
    items: items.map((it) => ({ ...it, completed: completedIds.has(it.id) })),
  });
}

/**
 * POST /api/calendar/google/today-items/:eventId/complete — ticks one
 * Google Calendar item off for a member/day, awarding 1 star (same as a
 * typed habit). Protected by the (member, event, day) unique constraint,
 * so it can't be double-awarded on a double click or retry.
 */
export async function completeTodayItem(eventId, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const day = validDay(body.day) ? body.day : new Date().toISOString().slice(0, 10);
  const memberId = body.memberId;
  const title = (body.title || "This item").slice(0, 100);
  if (!memberId) return errorResponse("memberId is required.");

  const db = env.DB;
  const member = await db.prepare("SELECT id FROM members WHERE id = ? AND family_id = ?").bind(memberId, familyId).first();
  if (!member) return errorResponse("Family member not found.", 404);

  const idempotencyKey = `calitem:${memberId}:${eventId}:${day}`;
  const ledgerId = newId();
  try {
    await db
      .prepare("INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES (?, ?, ?, 1, ?, ?)")
      .bind(ledgerId, familyId, memberId, `Did "${title}" on ${day}`, idempotencyKey)
      .run();
  } catch (err) {
    if (String(err.message || err).includes("UNIQUE")) return errorResponse("Already ticked off for today.", 409);
    throw err;
  }

  const id = newId();
  await db
    .prepare("INSERT INTO calendar_item_completions (id, family_id, member_id, google_event_id, day) VALUES (?, ?, ?, ?, ?)")
    .bind(id, familyId, memberId, eventId, day)
    .run();

  return json({ ok: true });
}

/** Internal helper other routes (events.js) call — never throws, best-effort. */
export async function syncEventToGoogle(env, familyId, event) {
  const conn = await env.DB.prepare(
    "SELECT refresh_token, google_calendar_id FROM google_calendar_connections WHERE family_id = ?"
  )
    .bind(familyId)
    .first();
  if (!conn) return; // not connected — nothing to do

  const accessToken = await refreshAccessToken(env, conn.refresh_token);
  await pushEventToGoogle(accessToken, conn.google_calendar_id, event);
}
