import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { ensureMemberStatus } from "../lib/schemaUpgrades.js";

const MAX_NAME_LENGTH = 60;
const VALID_ROLES = ["child", "parent"];
export const VALID_COLORS = [
  "#BE7050", // terracotta
  "#7C9473", // sage-dark (derived from #E4EAD9)
  "#6E8FA3", // soft blue-dark (derived from #E2ECEE)
  "#C9A227", // gold-dark (derived from #F8E8C7)
  "#A3604A", // peach-dark (derived from #F8E3D1)
];

function validName(name) {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= MAX_NAME_LENGTH;
}

/** GET /api/members — list members for the logged-in family. */
export async function listMembers(familyId, env) {
  const db = env.DB;
  const status = await ensureMemberStatus(db);
  const members = await db
    .prepare(
      `SELECT id, display_name, role, color, interests, created_at${status ? ", invited_at, joined_at, device_only" : ""} FROM members WHERE family_id = ? ORDER BY created_at ASC`
    )
    .bind(familyId)
    .all();
  return json({ ok: true, members: members.results || [] });
}

/** POST /api/members — add a new family member (e.g. a sibling or second parent). */
export async function addMember(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const displayName = (body.displayName || "").trim();
  const role = VALID_ROLES.includes(body.role) ? body.role : "child";
  const interests = Array.isArray(body.interests) ? body.interests.slice(0, 10) : [];

  if (!validName(displayName)) return errorResponse("Please enter a name (1-60 characters).");

  const db = env.DB;

  // Assign the next unused color so family members are visually distinct
  // on the calendar; falls back to cycling once everyone has a color.
  const existing = await db
    .prepare("SELECT color FROM members WHERE family_id = ?")
    .bind(familyId)
    .all();
  const usedColors = new Set((existing.results || []).map((m) => m.color).filter(Boolean));
  const color = VALID_COLORS.find((c) => !usedColors.has(c)) || VALID_COLORS[(existing.results || []).length % VALID_COLORS.length];

  const memberId = newId();
  await db
    .prepare("INSERT INTO members (id, family_id, display_name, role, color, interests) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(memberId, familyId, displayName, role, color, JSON.stringify(interests))
    .run();
  if (body.deviceOnly && (await ensureMemberStatus(db))) {
    await db.prepare("UPDATE members SET device_only = 1 WHERE id = ?").bind(memberId).run();
  }

  return json({
    ok: true,
    member: { id: memberId, displayName, role, color, interests },
  });
}

/** POST /api/members/:id/interests — { interests: [...] } what this person loves (used to suggest habits). */
export async function setInterests(id, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const interests = Array.isArray(body.interests) ? body.interests.map((x) => String(x).slice(0, 30)).slice(0, 15) : [];
  const db = env.DB;
  const r = await db.prepare("UPDATE members SET interests = ? WHERE id = ? AND family_id = ?").bind(JSON.stringify(interests), id, familyId).run();
  if (!r.meta || !r.meta.changes) return errorResponse("Family member not found.", 404);
  return json({ ok: true, interests });
}

/** POST /api/members/:id/status — { invited: true } after an invite is sent, { joined: true } when they start using the app. */
export async function setMemberStatus(id, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  if (!(await ensureMemberStatus(db))) return json({ ok: true });
  if (body.invited) await db.prepare("UPDATE members SET invited_at = datetime('now') WHERE id = ? AND family_id = ?").bind(id, familyId).run();
  if (body.joined) await db.prepare("UPDATE members SET joined_at = COALESCE(joined_at, datetime('now')) WHERE id = ? AND family_id = ?").bind(id, familyId).run();
  return json({ ok: true });
}
