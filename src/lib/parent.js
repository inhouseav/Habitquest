// Parent PIN — a second PIN that only parents know (the family PIN is
// shared with the kids so they can log in). Entering it unlocks "parent
// mode" for *this logged-in phone only* (stored on its session row), and
// every parent-only action checks that unlocked session on the server — so
// a child can't just pick a parent's name, or send a parent's id, to
// approve rewards, give kudos, change the goal or mark rewards given.
//
// Before a family has set a parent PIN, things work as they did (whoever
// picks a parent's name counts as that parent) so nothing breaks; the app
// prompts parents to set one.

import { json, errorResponse, readJson } from "./http.js";
import { hashPin, verifyPin } from "./crypto.js";
import { getBearerToken } from "./sessions.js";

const MAX_WRONG = 5;
const LOCK_MINUTES = 10;
let ready = false;

async function columnNames(db, table) {
  const rows = await db.prepare(`SELECT name FROM pragma_table_info('${table}')`).all();
  return new Set((rows.results || []).map((r) => r.name));
}

export async function ensureParentColumns(db) {
  if (ready) return true;
  try {
    const fam = await columnNames(db, "families");
    for (const [col, def] of [["parent_pin_hash", "TEXT"], ["parent_pin_failed", "INTEGER NOT NULL DEFAULT 0"], ["parent_pin_locked_until", "TEXT"]]) {
      if (!fam.has(col)) await db.prepare(`ALTER TABLE families ADD COLUMN ${col} ${def}`).run().catch(() => {});
    }
    if (!(await columnNames(db, "sessions")).has("parent_member_id")) {
      await db.prepare("ALTER TABLE sessions ADD COLUMN parent_member_id TEXT").run().catch(() => {});
    }
    const famAfter = await columnNames(db, "families");
    ready = famAfter.has("parent_pin_hash") && famAfter.has("parent_pin_failed") && (await columnNames(db, "sessions")).has("parent_member_id");
  } catch (err) {
    ready = false;
  }
  return ready;
}

async function familyPinHash(db, familyId) {
  const row = await db.prepare("SELECT parent_pin_hash FROM families WHERE id = ?").bind(familyId).first();
  return row ? row.parent_pin_hash : null;
}

async function sessionParentId(db, request) {
  const token = getBearerToken(request);
  if (!token) return null;
  const row = await db.prepare("SELECT parent_member_id FROM sessions WHERE id = ?").bind(token).first();
  return row ? row.parent_member_id : null;
}

/** For /api/me: has a parent PIN been set, and which parent (if any) has unlocked this phone. */
export async function parentStatus(db, request, familyId) {
  if (!(await ensureParentColumns(db))) return { parentPinSet: false, unlockedParentId: null };
  return { parentPinSet: !!(await familyPinHash(db, familyId)), unlockedParentId: await sessionParentId(db, request) };
}

/**
 * The parent allowed to act on this request, or null. `claimedId` is who the
 * phone says it is. With a parent PIN set, that must also be the parent who
 * unlocked this session; without one, the role check alone applies.
 */
export async function resolveParentActor(db, request, familyId, claimedId) {
  const member = claimedId
    ? await db.prepare("SELECT id, role, display_name FROM members WHERE id = ? AND family_id = ?").bind(claimedId, familyId).first()
    : null;
  if (!member || member.role !== "parent") return null;
  if (!(await ensureParentColumns(db))) return member;
  if (!(await familyPinHash(db, familyId))) return member;
  return (await sessionParentId(db, request)) === member.id ? member : null;
}

function validPin(pin) {
  return typeof pin === "string" && /^[0-9]{4,8}$/.test(pin);
}

/**
 * POST /api/parent/pin — { memberId, pin, currentPin? } set the parent PIN
 * (first time), or change it (needs the current parent PIN). Unlocks this
 * phone for that parent.
 */
export async function setParentPin(request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  if (!(await ensureParentColumns(db))) return errorResponse("Parent PIN isn't available right now.", 500);
  const member = await db.prepare("SELECT id, role FROM members WHERE id = ? AND family_id = ?").bind(body.memberId || "", familyId).first();
  if (!member || member.role !== "parent") return errorResponse("Only a parent can set the parent PIN.", 403);
  if (!validPin(body.pin)) return errorResponse("Parent PIN must be 4–8 digits.");
  const famPin = await db.prepare("SELECT pin_hash FROM families WHERE id = ?").bind(familyId).first();
  if (famPin && (await verifyPin(body.pin, famPin.pin_hash))) {
    return errorResponse("Pick a different PIN from the family PIN — the kids know that one!");
  }
  const existing = await familyPinHash(db, familyId);
  if (existing && !(await verifyPin(String(body.currentPin || ""), existing))) {
    return errorResponse("The current parent PIN isn't right.", 401);
  }
  await db.prepare("UPDATE families SET parent_pin_hash = ?, parent_pin_failed = 0, parent_pin_locked_until = NULL WHERE id = ?")
    .bind(await hashPin(body.pin), familyId).run();
  const token = getBearerToken(request);
  if (token) await db.prepare("UPDATE sessions SET parent_member_id = ? WHERE id = ?").bind(member.id, token).run();
  return json({ ok: true });
}

/** POST /api/parent/unlock — { memberId, pin } unlock parent mode on this phone. */
export async function unlockParent(request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  if (!(await ensureParentColumns(db))) return errorResponse("Parent PIN isn't available right now.", 500);
  const member = await db.prepare("SELECT id, role FROM members WHERE id = ? AND family_id = ?").bind(body.memberId || "", familyId).first();
  if (!member || member.role !== "parent") return errorResponse("That's not a parent.", 403);
  const fam = await db.prepare("SELECT parent_pin_hash, parent_pin_failed, parent_pin_locked_until FROM families WHERE id = ?").bind(familyId).first();
  if (!fam || !fam.parent_pin_hash) return errorResponse("No parent PIN has been set yet.", 400);
  if (fam.parent_pin_locked_until && new Date(fam.parent_pin_locked_until).getTime() > Date.now()) {
    return errorResponse("Too many wrong parent PINs. Try again in 10 minutes.", 429);
  }
  if (!(await verifyPin(String(body.pin || ""), fam.parent_pin_hash))) {
    const failed = (fam.parent_pin_failed || 0) + 1;
    if (failed >= MAX_WRONG) {
      await db.prepare("UPDATE families SET parent_pin_failed = 0, parent_pin_locked_until = ? WHERE id = ?")
        .bind(new Date(Date.now() + LOCK_MINUTES * 60000).toISOString(), familyId).run();
      return errorResponse("Too many wrong parent PINs. Try again in 10 minutes.", 429);
    }
    await db.prepare("UPDATE families SET parent_pin_failed = ? WHERE id = ?").bind(failed, familyId).run();
    return errorResponse(`That's not the parent PIN. ${MAX_WRONG - failed} ${MAX_WRONG - failed === 1 ? "try" : "tries"} left.`, 401);
  }
  await db.prepare("UPDATE families SET parent_pin_failed = 0, parent_pin_locked_until = NULL WHERE id = ?").bind(familyId).run();
  const token = getBearerToken(request);
  if (token) await db.prepare("UPDATE sessions SET parent_member_id = ? WHERE id = ?").bind(member.id, token).run();
  return json({ ok: true });
}

/** POST /api/parent/lock — turn parent mode off on this phone (e.g. handing it to a child). */
export async function lockParent(request, familyId, env) {
  const db = env.DB;
  if (!(await ensureParentColumns(db))) return json({ ok: true });
  const token = getBearerToken(request);
  if (token) await db.prepare("UPDATE sessions SET parent_member_id = NULL WHERE id = ? AND family_id = ?").bind(token, familyId).run();
  return json({ ok: true });
}

/** True if this phone may do parent things: no parent PIN set yet, or a parent has unlocked it. */
export async function hasParentSession(db, request, familyId) {
  if (!(await ensureParentColumns(db))) return true;
  if (!(await familyPinHash(db, familyId))) return true;
  return !!(await sessionParentId(db, request));
}
