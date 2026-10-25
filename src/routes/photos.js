import { json, errorResponse } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — plenty for a phone photo, keeps R2 usage small

function extFor(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

/**
 * POST /api/photos?recipeId=&habitId=&memberId=&day=&caption= — body is the
 * raw image bytes (fetch with { method: "POST", body: file, headers: {
 * "Content-Type": file.type } }). Stores to R2, records a row, returns the
 * photo's id (fetch it back via GET /api/photos/:id). A photo can be tagged
 * to a recipe (cooking) OR a habit (a Move Your Way / Grow It moment) — not
 * both — so it can later show up correctly in the Memories slideshow.
 */
export async function uploadPhoto(request, familyId, env) {
  if (!env.PHOTOS) {
    return errorResponse("Photo storage isn't set up yet — ask whoever's helping you build this to create the R2 bucket.", 500);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!ALLOWED_TYPES.includes(contentType)) {
    return errorResponse("Please upload a JPEG, PNG, WEBP, or GIF image.");
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) return errorResponse("No image data received.");
  if (bytes.byteLength > MAX_BYTES) return errorResponse("That photo is too large (max 8MB).");

  const url = new URL(request.url);
  const recipeId = url.searchParams.get("recipeId") || null;
  const habitId = url.searchParams.get("habitId") || null;
  const memberId = url.searchParams.get("memberId") || null;
  const day = validDay(url.searchParams.get("day")) ? url.searchParams.get("day") : todayStr();
  const caption = (url.searchParams.get("caption") || "").slice(0, 200);

  const db = env.DB;
  if (recipeId) {
    const recipe = await db.prepare("SELECT id FROM recipes WHERE id = ? AND (family_id = ? OR family_id IS NULL)").bind(recipeId, familyId).first();
    if (!recipe) return errorResponse("Recipe not found.", 404);
  }
  if (habitId) {
    const habit = await db.prepare("SELECT id FROM weekly_habits WHERE id = ? AND family_id = ?").bind(habitId, familyId).first();
    if (!habit) return errorResponse("Habit not found.", 404);
  }

  const photoId = newId();
  const r2Key = `${familyId}/${photoId}.${extFor(contentType)}`;

  await env.PHOTOS.put(r2Key, bytes, { httpMetadata: { contentType } });

  await db
    .prepare(
      "INSERT INTO cookbook_photos (id, family_id, recipe_id, habit_id, member_id, r2_key, content_type, source, caption, day) VALUES (?, ?, ?, ?, ?, ?, ?, 'upload', ?, ?)"
    )
    .bind(photoId, familyId, recipeId, habitId, memberId, r2Key, contentType, caption, day)
    .run();

  return json({ ok: true, photoId });
}

/** GET /api/photos/:id — streams the image back from R2 (family-scoped). */
export async function getPhoto(photoId, familyId, env) {
  if (!env.PHOTOS) return errorResponse("Photo storage isn't set up yet.", 500);

  const row = await env.DB.prepare("SELECT r2_key, content_type FROM cookbook_photos WHERE id = ? AND family_id = ?")
    .bind(photoId, familyId)
    .first();
  if (!row) return errorResponse("Photo not found.", 404);

  const obj = await env.PHOTOS.get(row.r2_key);
  if (!obj) return errorResponse("Photo not found.", 404);

  return new Response(obj.body, {
    headers: { "Content-Type": row.content_type || "image/jpeg", "Cache-Control": "private, max-age=86400" },
  });
}

/** DELETE /api/photos/:id */
export async function deletePhoto(photoId, familyId, env) {
  const row = await env.DB.prepare("SELECT r2_key FROM cookbook_photos WHERE id = ? AND family_id = ?").bind(photoId, familyId).first();
  if (!row) return errorResponse("Photo not found.", 404);

  if (env.PHOTOS) await env.PHOTOS.delete(row.r2_key).catch(() => {});
  await env.DB.prepare("DELETE FROM cookbook_photos WHERE id = ?").bind(photoId).run();

  return json({ ok: true });
}

/** GET /api/cookbook?start=YYYY-MM-DD&end=YYYY-MM-DD — photos + favourite recipes for the period. */
export async function getCookbook(request, familyId, env) {
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!validDay(start) || !validDay(end)) return errorResponse("start and end must be formatted YYYY-MM-DD.");

  const db = env.DB;
  const photos = await db
    .prepare(
      `SELECT p.id, p.recipe_id, p.habit_id, p.member_id, p.source, p.caption, p.day,
              r.title as recipe_title, m.display_name as member_name,
              h.title as habit_title, h.emoji as habit_emoji
       FROM cookbook_photos p
       LEFT JOIN recipes r ON r.id = p.recipe_id
       LEFT JOIN members m ON m.id = p.member_id
       LEFT JOIN weekly_habits h ON h.id = p.habit_id
       WHERE p.family_id = ? AND p.day BETWEEN ? AND ?
       ORDER BY p.day ASC, p.created_at ASC`
    )
    .bind(familyId, start, end)
    .all();

  const favorites = await db
    .prepare("SELECT id, title FROM recipes WHERE family_id = ? AND favorite = 1 ORDER BY title ASC")
    .bind(familyId)
    .all();

  return json({ ok: true, photos: photos.results || [], favorites: favorites.results || [] });
}

const MEMORIES_THRESHOLD = 5; // photos needed to unlock the next Memories slideshow

/**
 * GET /api/memories — a rainbow-themed slideshow of recent cooking AND
 * activity photos, once the family has uploaded enough of them. Below the
 * threshold, returns progress so the UI can show "X of Y photos" instead.
 */
export async function getMemories(familyId, env) {
  const db = env.DB;
  const countRow = await db.prepare("SELECT COUNT(*) as n FROM cookbook_photos WHERE family_id = ?").bind(familyId).first();
  const totalPhotos = countRow ? countRow.n : 0;
  const unlocked = totalPhotos >= MEMORIES_THRESHOLD;

  let slides = [];
  if (unlocked) {
    const rows = await db
      .prepare(
        `SELECT p.id, p.recipe_id, p.habit_id, p.day,
                r.title as recipe_title, h.title as habit_title, h.emoji as habit_emoji
         FROM cookbook_photos p
         LEFT JOIN recipes r ON r.id = p.recipe_id
         LEFT JOIN weekly_habits h ON h.id = p.habit_id
         WHERE p.family_id = ?
         ORDER BY p.created_at DESC
         LIMIT 12`
      )
      .bind(familyId)
      .all();

    slides = (rows.results || []).map((r) => {
      const kind = r.recipe_id ? "recipe" : r.habit_id ? "habit" : "photo";
      const title = r.recipe_title || r.habit_title || "Family moment";
      const tag = kind === "recipe" ? "🍳 Recipe" : kind === "habit" ? `${r.habit_emoji || "⚡"} Habit` : "📸 Family moment";
      return { id: r.id, kind, title, tag, day: r.day };
    });
  }

  return json({ ok: true, totalPhotos, threshold: MEMORIES_THRESHOLD, unlocked, slides });
}
