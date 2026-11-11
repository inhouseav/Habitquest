import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { ensureMemberStatus } from "../lib/schemaUpgrades.js";

const MAX_NAME_LENGTH = 60;
const VALID_ROLES = ["child", "parent"];
export const VALID_COLORS = [
  "#5E9BD6", // blue
  "#6BAF7A", // green
  "#9B7FD4", // purple
  "#E0A932", // gold
  "#E07FA6", // pink
  "#4DB3A8", // teal
];
// Person colours used to include the app's own button colour (terracotta),
// which made one person's events look like warnings. Old → new.
export const OLD_TO_NEW_COLORS = {
  "#BE7050": "#5E9BD6", "#7C9473": "#6BAF7A", "#6E8FA3": "#9B7FD4", "#C9A227": "#E0A932", "#A3604A": "#E07FA6",
};
/** Moves any member still on an old colour to its new colour (cheap; safe to run often). */
export async function refreshPersonColors(db, familyId) {
  const olds = Object.keys(OLD_TO_NEW_COLORS);
  const cases = olds.map(() => "WHEN ? THEN ?").join(" ");
  const args = olds.flatMap((o) => [o, OLD_TO_NEW_COLORS[o]]);
  await db.prepare(`UPDATE members SET color = CASE color ${cases} END WHERE family_id = ? AND color IN (${olds.map(() => "?").join(",")})`)
    .bind(...args, familyId, ...olds).run().catch(() => {});
}

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

/**
 * POST /api/members/:id/favorites — { move:[], cook:[], home:[], recipes:[ids], lunchbox:[] }
 * A person's favourites, used first when planning (habits, dinners, lunchboxes).
 */
export async function setFavorites(id, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  if (!(await ensureMemberStatus(db))) return errorResponse("Favourites aren't available right now.", 500);
  const list = (v, n = 30) => (Array.isArray(v) ? v.map((x) => String(x).trim().slice(0, 80)).filter(Boolean).slice(0, n) : []);
  const favorites = { move: list(body.move), cook: list(body.cook), home: list(body.home), recipes: list(body.recipes, 60), lunchbox: list(body.lunchbox) };
  const r = await db.prepare("UPDATE members SET favorites = ? WHERE id = ? AND family_id = ?").bind(JSON.stringify(favorites), id, familyId).run();
  if (!r.meta || !r.meta.changes) return errorResponse("Family member not found.", 404);
  return json({ ok: true, favorites });
}

/** POST /api/members/:id/avatar — { avatar: "🦊" } pick your own emoji face. */
export async function setAvatar(id, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  if (!(await ensureMemberStatus(db))) return errorResponse("Avatars aren't available right now.", 500);
  const avatar = String(body.avatar || "").trim().slice(0, 16) || null;
  if (avatar && !/^\p{Extended_Pictographic}/u.test(avatar)) return errorResponse("Pick an emoji.");
  const r = await db.prepare("UPDATE members SET avatar = ? WHERE id = ? AND family_id = ?").bind(avatar, id, familyId).run();
  if (!r.meta || !r.meta.changes) return errorResponse("Family member not found.", 404);
  return json({ ok: true, avatar });
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
