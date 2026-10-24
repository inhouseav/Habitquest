import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

const MAX_TITLE_LENGTH = 100;

/** GET /api/recipes — list this family's recipes plus shared/global ones (family_id NULL). */
export async function listRecipes(familyId, env) {
  const db = env.DB;
  const recipes = await db
    .prepare(
      "SELECT id, family_id, title, ingredients, steps, tags, created_at FROM recipes WHERE family_id = ? OR family_id IS NULL ORDER BY created_at DESC"
    )
    .bind(familyId)
    .all();
  return json({
    ok: true,
    recipes: (recipes.results || []).map((r) => ({
      ...r,
      ingredients: safeParse(r.ingredients, []),
      steps: safeParse(r.steps, []),
      tags: safeParse(r.tags, []),
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

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return errorResponse(`Please enter a title (1-${MAX_TITLE_LENGTH} characters).`);
  }
  if (ingredients.length === 0) return errorResponse("Please add at least one ingredient.");
  if (steps.length === 0) return errorResponse("Please add at least one step.");

  const db = env.DB;
  const recipeId = newId();
  await db
    .prepare("INSERT INTO recipes (id, family_id, title, ingredients, steps, tags) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(recipeId, familyId, title, JSON.stringify(ingredients), JSON.stringify(steps), JSON.stringify(tags))
    .run();

  return json({ ok: true, recipe: { id: recipeId, title, ingredients, steps, tags } });
}
