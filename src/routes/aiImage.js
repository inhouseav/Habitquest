import { errorResponse, json } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

// Cheapest OpenAI image tier at the time this was written — "low" quality,
// 1024x1024. Check current pricing before relying on this: providers
// change prices and model names often.
const MODEL = "gpt-image-1";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/ai/image — { recipeId } -> generates one food-photo-style
 * image for a recipe, stores it in the same R2 bucket/table as uploaded
 * photos (source: "ai"), and returns its photo id. Gated behind
 * OPENAI_API_KEY — a real Cloudflare secret, not set up until someone
 * (an adult, since it needs a paid account) adds it.
 */
export async function generateImage(request, familyId, env) {
  if (!env.OPENAI_API_KEY) {
    return errorResponse(
      "AI photos aren't set up yet — this needs a paid API key added by a parent. Real uploaded photos work right now, for free!",
      500
    );
  }
  if (!env.PHOTOS) {
    return errorResponse("Photo storage isn't set up yet — ask whoever's helping you build this to create the R2 bucket.", 500);
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.recipeId) return errorResponse("Missing recipeId.");

  const recipe = await env.DB.prepare("SELECT id, title, ingredients FROM recipes WHERE id = ? AND (family_id = ? OR family_id IS NULL)")
    .bind(body.recipeId, familyId)
    .first();
  if (!recipe) return errorResponse("Recipe not found.", 404);

  let ingredients = [];
  try { ingredients = JSON.parse(recipe.ingredients) || []; } catch (err) { /* ignore */ }

  const prompt = `A warm, appetizing, realistic food photograph of "${recipe.title}" (${ingredients.slice(0, 6).join(", ")}), plated simply on a home kitchen table, natural light, no text, no people, no logos.`;

  let aiRes;
  try {
    aiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
    });
  } catch (err) {
    return errorResponse("Couldn't reach the image service. Try again in a bit.", 502);
  }

  if (!aiRes.ok) {
    const errData = await aiRes.json().catch(() => ({}));
    return errorResponse(errData.error?.message || "The image service had a problem. Try again in a bit.", 502);
  }

  const data = await aiRes.json();
  const b64 = data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) return errorResponse("The image service didn't return an image. Try again.", 502);

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const photoId = newId();
  const r2Key = `${familyId}/${photoId}.png`;
  await env.PHOTOS.put(r2Key, bytes, { httpMetadata: { contentType: "image/png" } });

  await env.DB.prepare(
    "INSERT INTO cookbook_photos (id, family_id, recipe_id, r2_key, content_type, source, day) VALUES (?, ?, ?, ?, 'image/png', 'ai', ?)"
  ).bind(photoId, familyId, recipe.id, r2Key, todayStr()).run();

  return json({ ok: true, photoId });
}
