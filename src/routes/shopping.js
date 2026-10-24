import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

const MAX_NAME_LENGTH = 80;

/** GET /api/shopping — list the family's shared shopping list. */
export async function listShoppingItems(familyId, env) {
  const db = env.DB;
  const items = await db
    .prepare("SELECT id, name, checked, created_at FROM shopping_items WHERE family_id = ? ORDER BY checked ASC, created_at ASC")
    .bind(familyId)
    .all();
  return json({
    ok: true,
    items: (items.results || []).map((i) => ({ ...i, checked: !!i.checked })),
  });
}

/** POST /api/shopping — add an item to the shared list. */
export async function addShoppingItem(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const name = (body.name || "").trim();
  if (!name || name.length > MAX_NAME_LENGTH) {
    return errorResponse(`Please enter an item name (1-${MAX_NAME_LENGTH} characters).`);
  }

  const db = env.DB;
  const itemId = newId();
  await db
    .prepare("INSERT INTO shopping_items (id, family_id, name) VALUES (?, ?, ?)")
    .bind(itemId, familyId, name)
    .run();

  return json({ ok: true, item: { id: itemId, name, checked: false } });
}

/** POST /api/shopping/:id/toggle — check/uncheck an item. */
export async function toggleShoppingItem(itemId, familyId, env) {
  const db = env.DB;
  const item = await db
    .prepare("SELECT id, checked FROM shopping_items WHERE id = ? AND family_id = ?")
    .bind(itemId, familyId)
    .first();
  if (!item) return errorResponse("Item not found.", 404);

  const newChecked = item.checked ? 0 : 1;
  await db.prepare("UPDATE shopping_items SET checked = ? WHERE id = ?").bind(newChecked, itemId).run();

  return json({ ok: true, checked: !!newChecked });
}

/** DELETE /api/shopping/:id — remove an item from the list. */
export async function deleteShoppingItem(itemId, familyId, env) {
  const db = env.DB;
  const item = await db
    .prepare("SELECT id FROM shopping_items WHERE id = ? AND family_id = ?")
    .bind(itemId, familyId)
    .first();
  if (!item) return errorResponse("Item not found.", 404);

  await db.prepare("DELETE FROM shopping_items WHERE id = ?").bind(itemId).run();
  return json({ ok: true });
}
