// Simple D1-backed sessions. A session is just a random token stored in the
// sessions table alongside which family it belongs to and when it expires.
// This is deliberately simple (no JWTs, no secrets to manage) — appropriate
// for a family app, not a bank. Noted as such in BUILD_STATUS.md.

import { newSessionToken } from "./crypto.js";

const SESSION_DAYS = 30;

export async function createSession(db, familyId) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare("INSERT INTO sessions (id, family_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, familyId, expiresAt)
    .run();
  return token;
}

/** Returns the family_id for a valid, non-expired session token, or null. */
export async function getFamilyIdForToken(db, token) {
  if (!token) return null;
  const row = await db
    .prepare("SELECT family_id, expires_at FROM sessions WHERE id = ?")
    .bind(token)
    .first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row.family_id;
}

export function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}
