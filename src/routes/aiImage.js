import { errorResponse, json } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

// dall-e-3, standard quality, 1024x1024 — ~4c/image at current (2026-10)
// OpenAI pricing. We originally used gpt-image-1, but that model requires
// an extra "organization verification" (ID check) step most accounts
// haven't done, and errors with "model does not exist" until that's done.
// dall-e-3 needs just billing set up, no extra verification. Check current
// pricing/model names before relying on this: providers change these often.
const MODEL = "dall-e-3";

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
        quality: "standard",
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
  const result = data.data && data.data[0];
  if (!result) return errorResponse("The image service didn't return an image. Try again.", 502);

  // Without response_format, dall-e-3 sends back a temporary download link
  // (data[0].url) instead of the image bytes directly — fetch it.
  let bytes;
  if (result.b64_json) {
    bytes = Uint8Array.from(atob(result.b64_json), (c) => c.charCodeAt(0));
  } else if (result.url) {
    const imgRes = await fetch(result.url).catch(() => null);
    if (!imgRes || !imgRes.ok) return errorResponse("Couldn't download the generated image. Try again.", 502);
    bytes = new Uint8Array(await imgRes.arrayBuffer());
  } else {
    return errorResponse("The image service didn't return an image. Try again.", 502);
  }

  const photoId = newId();
  const r2Key = `${familyId}/${photoId}.png`;
  await env.PHOTOS.put(r2Key, bytes, { httpMetadata: { contentType: "image/png" } });

  await env.DB.prepare(
    "INSERT INTO cookbook_photos (id, family_id, recipe_id, r2_key, content_type, source, day) VALUES (?, ?, ?, ?, 'image/png', 'ai', ?)"
  ).bind(photoId, familyId, recipe.id, r2Key, todayStr()).run();

  return json({ ok: true, photoId });
}
