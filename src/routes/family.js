import { json, errorResponse, readJson } from "../lib/http.js";
import { hashPin, verifyPin, newId, newJoinCode } from "../lib/crypto.js";
import { createSession } from "../lib/sessions.js";

const MAX_NAME_LENGTH = 60;
const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 12;

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
    .prepare("INSERT INTO members (id, family_id, display_name, role) VALUES (?, ?, ?, ?)")
    .bind(memberId, familyId, firstMemberName, firstMemberRole)
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

  const valid = await verifyPin(pin, family.pin_hash);
  if (!valid) return errorResponse("Incorrect PIN.", 401);

  const token = await createSession(db, family.id);

  return json({
    ok: true,
    token,
    family: { id: family.id, name: family.name, joinCode: family.join_code },
  });
}

/** GET /api/me — returns the family + members for the current session. */
export async function me(familyId, env) {
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
  });
}
