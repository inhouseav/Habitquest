// Minimal Google Calendar integration: OAuth (authorization-code flow with
// a refresh token) + pushing an event into the family's connected calendar.
// No Google client library — just fetch() against Google's REST endpoints,
// which is all a Worker needs.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function buildAuthUrl(env, redirectUri, state) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Exchanges a one-time authorization code for tokens (first connection). */
export async function exchangeCodeForTokens(env, code, redirectUri) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Google token exchange failed.");
  return data; // { access_token, refresh_token, expires_in, ... }
}

/** Uses a stored refresh token to get a fresh short-lived access token. */
export async function refreshAccessToken(env, refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Google token refresh failed.");
  return data.access_token;
}

/** Creates an event on the family's connected Google Calendar. */
export async function pushEventToGoogle(accessToken, calendarId, event) {
  const body = {
    summary: event.title,
    start: { dateTime: new Date(event.startsAt).toISOString() },
    end: { dateTime: new Date(event.endsAt || addOneHour(event.startsAt)).toISOString() },
  };
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to create event on Google Calendar.");
  }
  return res.json();
}

function addOneHour(isoString) {
  const d = new Date(isoString);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}
