import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { sendWebPush } from "../lib/webpush.js";

/** POST /api/push/subscribe — save (or refresh) a device's push subscription for a member. */
export async function subscribe(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");
  const { memberId, endpoint, p256dh, auth } = body;
  if (!memberId || !endpoint || !p256dh || !auth) {
    return errorResponse("Missing subscription details.");
  }

  const db = env.DB;
  const existing = await db.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).first();
  if (existing) {
    await db
      .prepare("UPDATE push_subscriptions SET family_id = ?, member_id = ?, p256dh = ?, auth = ? WHERE id = ?")
      .bind(familyId, memberId, p256dh, auth, existing.id)
      .run();
    return json({ ok: true, id: existing.id });
  }

  const id = newId();
  await db
    .prepare(
      "INSERT INTO push_subscriptions (id, family_id, member_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id, familyId, memberId, endpoint, p256dh, auth)
    .run();
  return json({ ok: true, id });
}

/** POST /api/push/unsubscribe — remove a device's subscription (e.g. notifications turned off). */
export async function unsubscribe(request, familyId, env) {
  const body = await readJson(request);
  if (!body || !body.endpoint) return errorResponse("Missing endpoint.");
  await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND family_id = ?")
    .bind(body.endpoint, familyId)
    .run();
  return json({ ok: true });
}

/** POST /api/push/test — send a test notification to every device the caller's family has registered. */
export async function sendTest(request, familyId, env) {
  const db = env.DB;
  const subs = await db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE family_id = ?")
    .bind(familyId)
    .all();
  const results = [];
  for (const sub of subs.results || []) {
    try {
      const r = await sendWebPush(sub, { title: "Fuel the Fun 🌱", body: "Test notification — it works!" }, env);
      if (r.expired) await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(sub.id).run();
      results.push({ id: sub.id, ...r });
    } catch (err) {
      results.push({ id: sub.id, ok: false, error: err.message || String(err) });
    }
  }
  return json({ ok: true, sent: results.length, results });
}

/** Internal helper (not an HTTP route) other routes can call to notify the rest of a family. */
export async function notifyFamily(env, familyId, excludeMemberId, payload) {
  const db = env.DB;
  let query = "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE family_id = ?";
  const binds = [familyId];
  if (excludeMemberId) {
    query += " AND member_id != ?";
    binds.push(excludeMemberId);
  }
  const subs = await db.prepare(query).bind(...binds).all();
  for (const sub of subs.results || []) {
    try {
      const r = await sendWebPush(sub, payload, env);
      if (r.expired) await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(sub.id).run();
    } catch (err) {
      // Best-effort — a failed notification should never break the main request.
    }
  }
}
