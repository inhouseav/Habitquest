import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { addRecipePack } from "../lib/recipePack.js";

const MAX_TITLE_LENGTH = 100;
const VALID_CATEGORIES = ["breakfast", "lunch", "dinner", "snacks", "lunchboxes"];

// 💬 "Why we love it" — each family's own words about a recipe (kept per
// family, so shared recipes can have a different note in every family).
let notesReady = false;
export async function ensureRecipeNotes(db) {
  if (notesReady) return true;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS recipe_notes (
      family_id TEXT NOT NULL,
      recipe_id TEXT NOT NULL,
      why TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (family_id, recipe_id)
    )`).run();
    notesReady = true;
  } catch (err) { notesReady = false; }
  return notesReady;
}

/** POST /api/recipes/:id/why — { why } */
export async function setRecipeWhy(recipeId, request, familyId, env) {
  const db = env.DB;
  if (!(await ensureRecipeNotes(db))) return errorResponse("Can't save that right now.", 500);
  const body = (await readJson(request)) || {};
  const why = String(body.why || "").trim().slice(0, 280);
  const recipe = await db.prepare("SELECT id FROM recipes WHERE id = ? AND (family_id = ? OR family_id IS NULL)").bind(recipeId, familyId).first();
  if (!recipe) return errorResponse("Recipe not found.", 404);
  await db.prepare("INSERT INTO recipe_notes (family_id, recipe_id, why, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(family_id, recipe_id) DO UPDATE SET why = excluded.why, updated_at = excluded.updated_at")
    .bind(familyId, recipeId, why).run();
  return json({ ok: true, why });
}

/** GET /api/recipes — list this family's recipes plus shared/global ones (family_id NULL). */
export async function listRecipes(familyId, env) {
  const db = env.DB;
  const notes = await ensureRecipeNotes(db);
  const recipes = await db
    .prepare(
      notes
        ? "SELECT r.id, r.family_id, r.title, r.ingredients, r.steps, r.tags, r.favorite, r.category, r.created_at, n.why FROM recipes r LEFT JOIN recipe_notes n ON n.recipe_id = r.id AND n.family_id = ? WHERE r.family_id = ? OR r.family_id IS NULL ORDER BY r.created_at DESC"
        : "SELECT id, family_id, title, ingredients, steps, tags, favorite, category, created_at FROM recipes WHERE family_id = ? OR family_id IS NULL ORDER BY created_at DESC"
    )
    .bind(...(notes ? [familyId, familyId] : [familyId]))
    .all();
  return json({
    ok: true,
    recipes: (recipes.results || []).map((r) => ({
      ...r,
      ingredients: safeParse(r.ingredients, []),
      steps: safeParse(r.steps, []),
      tags: safeParse(r.tags, []),
      favorite: !!r.favorite,
    })),
  });
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

/** POST /api/recipes — add a new family recipe. */
export async function createRecipe(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const title = (body.title || "").trim();
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients.filter(Boolean).slice(0, 30) : [];
  const steps = Array.isArray(body.steps) ? body.steps.filter(Boolean).slice(0, 30) : [];
  const tags = Array.isArray(body.tags) ? body.tags.filter(Boolean).slice(0, 10) : [];
  const category = VALID_CATEGORIES.includes(body.category) ? body.category : null;

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return errorResponse(`Please enter a title (1-${MAX_TITLE_LENGTH} characters).`);
  }
  if (ingredients.length === 0) return errorResponse("Please add at least one ingredient.");
  if (steps.length === 0) return errorResponse("Please add at least one step.");

  const db = env.DB;
  const recipeId = newId();
  await db
    .prepare("INSERT INTO recipes (id, family_id, title, ingredients, steps, tags, category) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(recipeId, familyId, title, JSON.stringify(ingredients), JSON.stringify(steps), JSON.stringify(tags), category)
    .run();

  return json({ ok: true, recipe: { id: recipeId, title, ingredients, steps, tags, category } });
}

/** PUT /api/recipes/:id — edit an existing family recipe (not a shared/global one). */
export async function updateRecipe(recipeId, request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const title = (body.title || "").trim();
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients.filter(Boolean).slice(0, 30) : [];
  const steps = Array.isArray(body.steps) ? body.steps.filter(Boolean).slice(0, 30) : [];
  const tags = Array.isArray(body.tags) ? body.tags.filter(Boolean).slice(0, 10) : [];
  const category = VALID_CATEGORIES.includes(body.category) ? body.category : null;

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return errorResponse(`Please enter a title (1-${MAX_TITLE_LENGTH} characters).`);
  }
  if (ingredients.length === 0) return errorResponse("Please add at least one ingredient.");
  if (steps.length === 0) return errorResponse("Please add at least one step.");

  const db = env.DB;
  const recipe = await db.prepare("SELECT id FROM recipes WHERE id = ? AND family_id = ?").bind(recipeId, familyId).first();
  if (!recipe) return errorResponse("Recipe not found.", 404);

  await db
    .prepare("UPDATE recipes SET title = ?, ingredients = ?, steps = ?, tags = ?, category = ? WHERE id = ?")
    .bind(title, JSON.stringify(ingredients), JSON.stringify(steps), JSON.stringify(tags), category, recipeId)
    .run();

  return json({ ok: true, recipe: { id: recipeId, title, ingredients, steps, tags, category } });
}

/** POST /api/recipes/:id/favorite — toggle a recipe as a family favourite. */
export async function toggleFavorite(recipeId, familyId, env) {
  const db = env.DB;
  const recipe = await db.prepare("SELECT id, favorite FROM recipes WHERE id = ? AND (family_id = ? OR family_id IS NULL)").bind(recipeId, familyId).first();
  if (!recipe) return errorResponse("Recipe not found.", 404);

  const nextValue = recipe.favorite ? 0 : 1;
  await db.prepare("UPDATE recipes SET favorite = ? WHERE id = ?").bind(nextValue, recipeId).run();

  return json({ ok: true, favorite: !!nextValue });
}

/** POST /api/recipes/pack — adds the family-favourites + Aussie recipe pack (skips ones you have). */
export async function addPack(familyId, env) {
  const result = await addRecipePack(env.DB, familyId, newId);
  return json({ ok: true, ...result });
}
