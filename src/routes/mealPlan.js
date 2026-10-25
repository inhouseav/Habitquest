import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

function safeParseArray(value) {
  try {
    const v = JSON.parse(value);
    return Array.isArray(v) ? v : [];
  } catch (err) {
    return [];
  }
}

/** GET /api/meal-plan?startDay=YYYY-MM-DD&endDay=YYYY-MM-DD — list meal options for a date range. */
export async function listMealPlan(request, familyId, env) {
  const url = new URL(request.url);
  const startDay = url.searchParams.get("startDay");
  const endDay = url.searchParams.get("endDay");
  if (!validDay(startDay) || !validDay(endDay)) {
    return errorResponse("startDay and endDay must be formatted YYYY-MM-DD.");
  }

  const db = env.DB;
  const items = await db
    .prepare(
      "SELECT id, day, recipe_id, title, votes, together FROM meal_plan_items WHERE family_id = ? AND day BETWEEN ? AND ? ORDER BY day ASC, created_at ASC"
    )
    .bind(familyId, startDay, endDay)
    .all();

  const results = (items.results || []).map((i) => ({ ...i, votes: safeParseArray(i.votes), together: !!i.together }));
  const togetherCount = results.filter((i) => i.together).length;

  return json({ ok: true, items: results, togetherCount });
}

/** POST /api/meal-plan — propose a meal option for a given day. */
export async function proposeMeal(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const day = body.day;
  const title = (body.title || "").trim();
  const recipeId = body.recipeId || null;
  const together = body.together ? 1 : 0;

  if (!validDay(day)) return errorResponse("day must be formatted YYYY-MM-DD.");
  if (!title) return errorResponse("Please enter a meal title.");

  const db = env.DB;
  if (recipeId) {
    const recipe = await db
      .prepare("SELECT id FROM recipes WHERE id = ? AND (family_id = ? OR family_id IS NULL)")
      .bind(recipeId, familyId)
      .first();
    if (!recipe) return errorResponse("Recipe not found.", 404);
  }

  const itemId = newId();
  await db
    .prepare("INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, votes, together) VALUES (?, ?, ?, ?, ?, '[]', ?)")
    .bind(itemId, familyId, day, recipeId, title, together)
    .run();

  return json({ ok: true, item: { id: itemId, day, recipeId, title, votes: [], together: !!together } });
}

/** POST /api/meal-plan/:id/vote — toggle this member's vote on a meal option. */
export async function toggleVote(itemId, request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const memberId = body.memberId;
  if (!memberId) return errorResponse("memberId is required.");

  const db = env.DB;
  const item = await db
    .prepare("SELECT id, votes FROM meal_plan_items WHERE id = ? AND family_id = ?")
    .bind(itemId, familyId)
    .first();
  if (!item) return errorResponse("Meal option not found.", 404);

  const member = await db
    .prepare("SELECT id FROM members WHERE id = ? AND family_id = ?")
    .bind(memberId, familyId)
    .first();
  if (!member) return errorResponse("Family member not found.", 404);

  let votes = safeParseArray(item.votes);
  if (votes.includes(memberId)) {
    votes = votes.filter((v) => v !== memberId);
  } else {
    votes.push(memberId);
  }

  await db.prepare("UPDATE meal_plan_items SET votes = ? WHERE id = ?").bind(JSON.stringify(votes), itemId).run();

  return json({ ok: true, votes });
}

/** POST /api/meal-plan/:id/together — toggle whether this meal is a together family meal. */
export async function toggleTogether(itemId, familyId, env) {
  const db = env.DB;
  const item = await db.prepare("SELECT id, together FROM meal_plan_items WHERE id = ? AND family_id = ?").bind(itemId, familyId).first();
  if (!item) return errorResponse("Meal option not found.", 404);

  const nextValue = item.together ? 0 : 1;
  await db.prepare("UPDATE meal_plan_items SET together = ? WHERE id = ?").bind(nextValue, itemId).run();

  return json({ ok: true, together: !!nextValue });
}
