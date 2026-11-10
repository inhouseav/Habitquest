import { json, errorResponse, readJson } from "../lib/http.js";
import { hashPin, verifyPin, newId, newJoinCode } from "../lib/crypto.js";
import { createSession } from "../lib/sessions.js";
import { VALID_COLORS } from "./members.js";
import { seedDemoFamily, DEMO_PIN } from "../lib/demoSeed.js";
import { ensureFoodPassport } from "./foodPassport.js";
import { parentStatus } from "../lib/parent.js";
import { attachDemoPictures } from "../lib/demoPictures.js";

const MAX_NAME_LENGTH = 60;
const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 12;
const MAX_WRONG_PINS = 5;
const LOCKOUT_MINUTES = 10;

// The app adds its own PIN-lockout columns (migration 017) the first time
// someone logs in, so nobody has to remember to run it in the D1 console.
// Checked once per Worker instance; if anything goes wrong, login still
// works normally, just without the lockout.
let lockoutColumnsReady = false;
export async function ensureLockoutColumns(db) {
  if (lockoutColumnsReady) return true;
  try {
    const cols = await db.prepare("SELECT name FROM pragma_table_info('families')").all();
    const names = new Set((cols.results || []).map((r) => r.name));
    if (!names.has("failed_pin_attempts")) {
      await db.prepare("ALTER TABLE families ADD COLUMN failed_pin_attempts INTEGER NOT NULL DEFAULT 0").run().catch(() => {});
    }
    if (!names.has("pin_locked_until")) {
      await db.prepare("ALTER TABLE families ADD COLUMN pin_locked_until TEXT").run().catch(() => {});
    }
    const after = await db.prepare("SELECT name FROM pragma_table_info('families')").all();
    const afterNames = new Set((after.results || []).map((r) => r.name));
    lockoutColumnsReady = afterNames.has("failed_pin_attempts") && afterNames.has("pin_locked_until");
  } catch (err) {
    lockoutColumnsReady = false;
  }
  return lockoutColumnsReady;
}

function validPin(pin) {
  return (
    typeof pin === "string" &&
    pin.length >= PIN_MIN_LENGTH &&
    pin.length <= PIN_MAX_LENGTH &&
    /^[0-9]+$/.test(pin)
  );
}

function validName(name) {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= MAX_NAME_LENGTH;
}

/** POST /api/family/signup — creates a new family + its first member, returns a session. */
export async function signup(request, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const familyName = (body.familyName || "").trim();
  const pin = body.pin || "";
  const firstMemberName = (body.firstMemberName || "").trim();
  const firstMemberRole = body.firstMemberRole === "child" ? "child" : "parent";

  if (!validName(familyName)) return errorResponse("Please enter a family name (1-60 characters).");
  if (!validPin(pin)) return errorResponse(`PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits.`);
  if (!validName(firstMemberName)) return errorResponse("Please enter a name for the first family member.");

  const db = env.DB;
  const familyId = newId();
  const pinHash = await hashPin(pin);

  // Join codes must be unique — retry a few times on the rare collision.
  let joinCode = null;
  for (let attempt = 0; attempt < 5 && !joinCode; attempt++) {
    const candidate = newJoinCode();
    const existing = await db
      .prepare("SELECT id FROM families WHERE join_code = ?")
      .bind(candidate)
      .first();
    if (!existing) joinCode = candidate;
  }
  if (!joinCode) return errorResponse("Could not generate a join code, please try again.", 500);

  await db
    .prepare("INSERT INTO families (id, name, pin_hash, join_code) VALUES (?, ?, ?, ?)")
    .bind(familyId, familyName, pinHash, joinCode)
    .run();

  const memberId = newId();
  await db
    .prepare("INSERT INTO members (id, family_id, display_name, role, color) VALUES (?, ?, ?, ?, ?)")
    .bind(memberId, familyId, firstMemberName, firstMemberRole, VALID_COLORS[0])
    .run();

  const token = await createSession(db, familyId);

  return json({
    ok: true,
    token,
    family: { id: familyId, name: familyName, joinCode },
    member: { id: memberId, displayName: firstMemberName, role: firstMemberRole },
  });
}

/** POST /api/family/login — logs into an existing family with join code + PIN. */
export async function login(request, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const joinCode = (body.joinCode || "").trim().toUpperCase();
  const pin = body.pin || "";

  if (!joinCode) return errorResponse("Please enter your family's join code.");
  if (!validPin(pin)) return errorResponse("Please enter your PIN.");

  const db = env.DB;
  const family = await db
    .prepare("SELECT id, name, pin_hash, join_code FROM families WHERE join_code = ?")
    .bind(joinCode)
    .first();

  if (!family) return errorResponse("No family found with that join code.", 404);

  // PIN-guessing protection. Kept in its own try/catch so that if the
  // 017_login_lockout migration hasn't been run on this database yet,
  // logging in still works normally (just without the lockout).
  let lockout = null;
  await ensureLockoutColumns(db);
  try {
    lockout = await db
      .prepare("SELECT failed_pin_attempts, pin_locked_until FROM families WHERE id = ?")
      .bind(family.id)
      .first();
  } catch (err) {
    lockout = null;
  }
  if (lockout && lockout.pin_locked_until && new Date(lockout.pin_locked_until).getTime() > Date.now()) {
    const mins = Math.max(1, Math.ceil((new Date(lockout.pin_locked_until).getTime() - Date.now()) / 60000));
    return errorResponse(`Too many wrong PINs. Please wait ${mins} minute${mins === 1 ? "" : "s"} and try again.`, 429);
  }

  const valid = await verifyPin(pin, family.pin_hash);
  if (!valid) {
    if (lockout) {
      const attempts = (lockout.failed_pin_attempts || 0) + 1;
      if (attempts >= MAX_WRONG_PINS) {
        const until = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
        await db.prepare("UPDATE families SET failed_pin_attempts = 0, pin_locked_until = ? WHERE id = ?").bind(until, family.id).run();
        return errorResponse(`Too many wrong PINs. Please wait ${LOCKOUT_MINUTES} minutes and try again.`, 429);
      }
      await db.prepare("UPDATE families SET failed_pin_attempts = ? WHERE id = ?").bind(attempts, family.id).run();
      const left = MAX_WRONG_PINS - attempts;
      return errorResponse(`Incorrect PIN. ${left} ${left === 1 ? "try" : "tries"} left before a 10-minute pause.`, 401);
    }
    return errorResponse("Incorrect PIN.", 401);
  }

  if (lockout && (lockout.failed_pin_attempts || lockout.pin_locked_until)) {
    await db.prepare("UPDATE families SET failed_pin_attempts = 0, pin_locked_until = NULL WHERE id = ?").bind(family.id).run();
  }

  const token = await createSession(db, family.id);

  return json({
    ok: true,
    token,
    family: { id: family.id, name: family.name, joinCode: family.join_code },
  });
}

/** GET /api/me — returns the family + members for the current session. */
export async function me(familyId, env, request) {
  const db = env.DB;
  const family = await db
    .prepare("SELECT id, name, join_code FROM families WHERE id = ?")
    .bind(familyId)
    .first();
  if (!family) return errorResponse("Family not found.", 404);

  const members = await db
    .prepare("SELECT id, display_name, role, color, interests FROM members WHERE family_id = ? ORDER BY created_at ASC")
    .bind(familyId)
    .all();

  return json({
    ok: true,
    family: { id: family.id, name: family.name, joinCode: family.join_code },
    members: members.results || [],
    parent: request ? await parentStatus(db, request, familyId) : { parentPinSet: false, unlockedParentId: null },
  });
}

/**
 * POST /api/family/demo — { today: "YYYY-MM-DD", tzOffsetMinutes } -> makes a
 * brand-new, fully filled-in demo family dated around the visitor's own
 * today, and logs them straight into it. Every call is a separate copy.
 */
export async function demo(request, env, ctx) {
  const body = (await readJson(request)) || {};
  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : new Date().toISOString().slice(0, 10);
  const offset = Number.isFinite(body.tzOffsetMinutes) && Math.abs(body.tzOffsetMinutes) <= 14 * 60 ? body.tzOffsetMinutes : 0;

  const db = env.DB;
  const withPassport = await ensureFoodPassport(db);
  const { familyId, joinCode } = await seedDemoFamily(db, { today, tzOffsetMinutes: offset, withPassport });
  const token = await createSession(db, familyId);
  // Recipe pictures: shared ones attach instantly; if one has never been
  // made yet, it's made in the background so the visitor isn't kept waiting.
  const pictures = attachDemoPictures(env, familyId, newId);
  if (ctx && ctx.waitUntil) ctx.waitUntil(pictures); else await pictures;
  return json({ ok: true, token, demo: true, pin: DEMO_PIN, family: { id: familyId, joinCode } });
}
