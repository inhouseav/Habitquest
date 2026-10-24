import { json, errorResponse } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { buildAuthUrl, exchangeCodeForTokens, refreshAccessToken, pushEventToGoogle } from "../lib/googleCalendar.js";

function redirectUriFor(url) {
  // Must exactly match what's registered in the Google Cloud Console.
  return `${url.origin}/api/calendar/google/callback`;
}

/** GET /api/calendar/google/status — is this family connected? */
export async function status(familyId, env) {
  const row = await env.DB.prepare("SELECT family_id FROM google_calendar_connections WHERE family_id = ?")
    .bind(familyId)
    .first();
  return json({ ok: true, connected: !!row });
}

/** GET /api/calendar/google/start — kicks off the OAuth flow; redirects to Google. */
export async function start(familyId, env, url) {
  if (!env.GOOGLE_CLIENT_ID) {
    return errorResponse("Google Calendar isn't set up on the server yet (missing GOOGLE_CLIENT_ID).", 500);
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
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

/** POST /api/calendar/google/disconnect */
export async function disconnect(familyId, env) {
  await env.DB.prepare("DELETE FROM google_calendar_connections WHERE family_id = ?").bind(familyId).run();
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
