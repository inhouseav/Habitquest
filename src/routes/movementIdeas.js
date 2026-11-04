import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

const MAX_TITLE_LENGTH = 60;

/** GET /api/movement-ideas — this family's remembered movement ideas, for the Planner palette. */
export async function listMovementIdeas(familyId, env) {
  const rows = await env.DB.prepare(
    "SELECT id, title FROM movement_ideas WHERE family_id = ? ORDER BY created_at ASC"
  )
    .bind(familyId)
    .all();
  return json({ ok: true, ideas: rows.results || [] });
}

/**
 * POST /api/movement-ideas — remembers a new movement idea (or just returns
 * the existing one if this family already added this exact title — no
 * duplicates piling up in the palette).
 */
export async function addMovementIdea(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");
  const title = (body.title || "").trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    return errorResponse(`Please enter an idea (1-${MAX_TITLE_LENGTH} characters).`);
  }

  const db = env.DB;
  const existing = await db.prepare("SELECT id, title FROM movement_ideas WHERE family_id = ? AND title = ?").bind(familyId, title).first();
  if (existing) return json({ ok: true, idea: existing });

  const id = newId();
  await db.prepare("INSERT INTO movement_ideas (id, family_id, title) VALUES (?, ?, ?)").bind(id, familyId, title).run();
  return json({ ok: true, idea: { id, title } });
}
