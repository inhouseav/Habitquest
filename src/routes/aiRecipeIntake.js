import { json, errorResponse, readJson } from "../lib/http.js";

const MODEL = "claude-haiku-4-5-20251001"; // fast + cheap, consistent with the other AI features
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — same limit as a regular photo upload
const VALID_CATEGORIES = ["breakfast", "lunch", "dinner", "snacks", "lunchboxes"];

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function parseRecipeJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return null;
  }
  if (!parsed.title || !Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) return null;
  if (!VALID_CATEGORIES.includes(parsed.category)) parsed.category = null;
  return {
    title: String(parsed.title).slice(0, 100),
    ingredients: parsed.ingredients.filter((i) => typeof i === "string" && i.trim()).slice(0, 30),
    steps: parsed.steps.filter((s) => typeof s === "string" && s.trim()).slice(0, 30),
    category: parsed.category,
  };
}

async function callClaude(env, messages) {
  let aiRes;
  try {
    aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1000, messages }),
    });
  } catch (err) {
    return { error: errorResponse("Couldn't reach the AI service. Try again in a bit.", 502) };
  }
  if (!aiRes.ok) {
    const errData = await aiRes.json().catch(() => ({}));
    return { error: errorResponse(errData.error?.message || "The AI service had a problem. Try again in a bit.", 502) };
  }
  const data = await aiRes.json();
  const text = (data.content || []).map((block) => block.text || "").join("").trim();
  return { text };
}

/**
 * POST /api/ai/recipe-from-photo — body is the raw image bytes of a photo of
 * a recipe (cookbook page, handwritten card, packet). AI reads it and
 * returns a draft recipe card (title/ingredients/steps/category) for the
 * family to review and edit before saving — never saved automatically.
 */
export async function recipeFromPhoto(request, familyId, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return errorResponse("AI recipe scanning isn't set up yet — ask whoever's helping you build this to add an API key.", 500);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!ALLOWED_TYPES.includes(contentType)) {
    return errorResponse("Please use a JPEG, PNG, WEBP, or GIF photo.");
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) return errorResponse("No image data received.");
  if (bytes.byteLength > MAX_BYTES) return errorResponse("That photo is too large (max 8MB).");

  const base64 = arrayBufferToBase64(bytes);
  const prompt = `You are reading a photo of a recipe (a cookbook page, a handwritten recipe card, or a packet) for a kids' family cooking app called "Fuel the Fun", for families with children aged 7-12.

Extract the recipe's title, its ingredients (one per array entry, keep quantities/units as shown), and its steps (short, clear, one per array entry). Then pick the single best category for when this is usually eaten: breakfast, lunch, dinner, snacks, or lunchboxes.

Stay close to what's actually shown — don't invent ingredients or steps that aren't legible in the photo. If the title isn't visible, give it a short descriptive one based on the ingredients.

Respond with ONLY a JSON object, no other text, no markdown fences, in exactly this shape:
{"title": "...", "ingredients": ["...", ...], "steps": ["...", ...], "category": "breakfast" | "lunch" | "dinner" | "snacks" | "lunchboxes"}`;

  const { text, error } = await callClaude(env, [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: contentType, data: base64 } },
        { type: "text", text: prompt },
      ],
    },
  ]);
  if (error) return error;

  const recipe = parseRecipeJson(text);
  if (!recipe) return errorResponse("Couldn't read a recipe from that photo clearly — try a clearer, well-lit photo, or type it in by hand.", 502);

  return json({ ok: true, recipe });
}

/**
 * POST /api/ai/recipe-from-name — { name } -> AI drafts a simple family
 * recipe (title/ingredients/steps/category) for the family to review and
 * edit before saving.
 */
export async function recipeFromName(request, familyId, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return errorResponse("AI recipe suggestions aren't set up yet — ask whoever's helping you build this to add an API key.", 500);
  }

  const body = await readJson(request);
  const name = (body && body.name ? String(body.name) : "").trim().slice(0, 100);
  if (!name) return errorResponse("Type a dish name first (e.g. \"veggie tacos\").");

  const prompt = `You are a recipe writer for a kids' family cooking app called "Fuel the Fun", for families with children aged 7-12. Write a simple, family-friendly recipe for: "${name}".

Rules:
- Keep it realistic for a home kitchen, around 5-12 ingredients.
- Steps should be short and clear enough for a kid to help with, when safe to do so.
- NEVER mention calories, weight loss, or dieting.
- Then pick the single best category for when this is usually eaten: breakfast, lunch, dinner, snacks, or lunchboxes.

Respond with ONLY a JSON object, no other text, no markdown fences, in exactly this shape:
{"title": "a short recipe title", "ingredients": ["...", ...], "steps": ["...", ...], "category": "breakfast" | "lunch" | "dinner" | "snacks" | "lunchboxes"}`;

  const { text, error } = await callClaude(env, [{ role: "user", content: prompt }]);
  if (error) return error;

  const recipe = parseRecipeJson(text);
  if (!recipe) return errorResponse("The AI's answer wasn't quite right. Try again.", 502);

  return json({ ok: true, recipe });
}
