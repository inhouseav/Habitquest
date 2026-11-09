import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

const MAX_TITLE_LENGTH = 60;
const VALID_CATEGORIES = ["movement", "home"];

function categoryOf(value) {
  return VALID_CATEGORIES.includes(value) ? value : "movement";
}

/**
 * GET /api/movement-ideas?category=movement|home — this family's remembered
 * ideas for that Planner tab, most-used first (ties broken oldest-first, so
 * a brand new idea doesn't look buried just because it hasn't been used
 * yet — it still shows, just below ones already proven popular).
 */
export async function listMovementIdeas(request, familyId, env) {
  const url = new URL(request.url);
  const category = categoryOf(url.searchParams.get("category"));
  const rows = await env.DB.prepare(
    "SELECT id, title, use_count as useCount FROM movement_ideas WHERE family_id = ? AND category = ? ORDER BY use_count DESC, created_at ASC"
  )
    .bind(familyId, category)
    .all();
  return json({ ok: true, ideas: rows.results || [] });
}

/**
 * POST /api/movement-ideas — remembers a new idea for a Planner tab (or just
 * returns the existing one if this family already added this exact title in
 * this category — no duplicates piling up in the palette).
 */
export async function addMovementIdea(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");
  const title = (body.title || "").trim();
  const category = categoryOf(body.category);
  if (!title || title.length > MAX_TITLE_LENGTH) {
    return errorResponse(`Please enter an idea (1-${MAX_TITLE_LENGTH} characters).`);
  }

  const db = env.DB;
  const existing = await db.prepare("SELECT id, title, use_count as useCount FROM movement_ideas WHERE family_id = ? AND category = ? AND title = ?").bind(familyId, category, title).first();
  if (existing) return json({ ok: true, idea: existing });

  const id = newId();
  await db.prepare("INSERT INTO movement_ideas (id, family_id, title, category) VALUES (?, ?, ?, ?)").bind(id, familyId, title, category).run();
  return json({ ok: true, idea: { id, title, useCount: 0 } });
}

/**
 * POST /api/movement-ideas/:id/use — bumps an idea's popularity count. Fired
 * whenever one gets dragged/tapped onto the calendar from the Planner — best
 * effort, never blocks the actual event/habit it's attached to.
 */
export async function useMovementIdea(id, familyId, env) {
  const db = env.DB;
  const existing = await db.prepare("SELECT id FROM movement_ideas WHERE id = ? AND family_id = ?").bind(id, familyId).first();
  if (!existing) return errorResponse("Not found.", 404);
  await db.prepare("UPDATE movement_ideas SET use_count = use_count + 1 WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

/** DELETE /api/movement-ideas/:id — removes an idea from this family's Planner list. */
export async function deleteMovementIdea(id, familyId, env) {
  const db = env.DB;
  const existing = await db.prepare("SELECT id FROM movement_ideas WHERE id = ? AND family_id = ?").bind(id, familyId).first();
  if (!existing) return errorResponse("Not found.", 404);
  await db.prepare("DELETE FROM movement_ideas WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
