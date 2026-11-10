import { json, errorResponse, readJson } from "../lib/http.js";
import { ensureMealMember } from "../lib/schemaUpgrades.js";
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

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];

/** GET /api/meal-plan?startDay=YYYY-MM-DD&endDay=YYYY-MM-DD — list meal options for a date range. */
export async function listMealPlan(request, familyId, env) {
  const url = new URL(request.url);
  const startDay = url.searchParams.get("startDay");
  const endDay = url.searchParams.get("endDay");
  if (!validDay(startDay) || !validDay(endDay)) {
    return errorResponse("startDay and endDay must be formatted YYYY-MM-DD.");
  }

  const db = env.DB;
  const hasMember = await ensureMealMember(db);
  const items = await db
    .prepare(
      `SELECT id, day, recipe_id as recipeId, title, votes, together, meal_type as mealType${hasMember ? ", member_id as memberId" : ""} FROM meal_plan_items WHERE family_id = ? AND day BETWEEN ? AND ? ORDER BY day ASC, created_at ASC`
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
  const mealType = VALID_MEAL_TYPES.includes(body.mealType) ? body.mealType : null;

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

  // Optional: who it's for (blank = the whole family).
  let memberId = null;
  if (body.memberId) {
    const m = await db.prepare("SELECT id FROM members WHERE id = ? AND family_id = ?").bind(body.memberId, familyId).first();
    if (!m) return errorResponse("Family member not found.", 404);
    memberId = m.id;
  }

  const itemId = newId();
  if (memberId && (await ensureMealMember(db))) {
    await db
      .prepare("INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, votes, together, meal_type, member_id) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?)")
      .bind(itemId, familyId, day, recipeId, title, together, mealType, memberId)
      .run();
  } else {
    await db
      .prepare("INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, votes, together, meal_type) VALUES (?, ?, ?, ?, ?, '[]', ?, ?)")
      .bind(itemId, familyId, day, recipeId, title, together, mealType)
      .run();
  }

  return json({ ok: true, item: { id: itemId, day, recipeId, title, votes: [], together: !!together, mealType, memberId } });
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

/** DELETE /api/meal-plan/:id — remove a planned meal. */
export async function deleteMeal(itemId, familyId, env) {
  const db = env.DB;
  const item = await db.prepare("SELECT id FROM meal_plan_items WHERE id = ? AND family_id = ?").bind(itemId, familyId).first();
  if (!item) return errorResponse("Meal not found.", 404);
  await db.prepare("DELETE FROM meal_plan_items WHERE id = ?").bind(itemId).run();
  return json({ ok: true });
}

/**
 * POST /api/meal-plan/:id/update — { day?, memberId? } move a meal to
 * another day and/or change who it's for (memberId null = whole family).
 */
export async function updateMeal(itemId, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  const item = await db.prepare("SELECT id FROM meal_plan_items WHERE id = ? AND family_id = ?").bind(itemId, familyId).first();
  if (!item) return errorResponse("Meal not found.", 404);
  if (body.day !== undefined) {
    if (!validDay(body.day)) return errorResponse("day must be formatted YYYY-MM-DD.");
    await db.prepare("UPDATE meal_plan_items SET day = ? WHERE id = ?").bind(body.day, itemId).run();
  }
  if (body.memberId !== undefined) {
    if (!(await ensureMealMember(db))) return errorResponse("Can't set who it's for right now.", 500);
    let memberId = null;
    if (body.memberId) {
      const m = await db.prepare("SELECT id FROM members WHERE id = ? AND family_id = ?").bind(body.memberId, familyId).first();
      if (!m) return errorResponse("Family member not found.", 404);
      memberId = m.id;
    }
    await db.prepare("UPDATE meal_plan_items SET member_id = ? WHERE id = ?").bind(memberId, itemId).run();
  }
  return json({ ok: true });
}
