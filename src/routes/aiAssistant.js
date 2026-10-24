import { json, errorResponse, readJson } from "../lib/http.js";

const MODEL = "claude-haiku-4-5-20251001"; // fast + cheap, plenty for a short suggestion
const VALID_PILLARS = ["fuel", "move", "grow"];

function parseInterests(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string" && s.trim()) : [];
  } catch (err) {
    return [];
  }
}

function buildPrompt(member, mood) {
  const interests = parseInterests(member.interests);
  const interestsLine = interests.length
    ? `They especially like: ${interests.join(", ")}.`
    : "No specific interests are on file for them yet.";
  const moodLine = mood ? `Right now they said they're feeling: "${mood}".` : "";

  return `You are a friendly, encouraging habit coach inside a kids' healthy-habits app called "Fuel the Fun", made for children aged 7-12 (and their families).

Suggest ONE fun, simple, real-world activity idea for ${member.display_name} (role: ${member.role}) to do today. ${interestsLine} ${moodLine}

Rules:
- It must fit ONE of these three "pillars": fuel (healthy eating/cooking/trying new food), move (physical activity/getting outside), or grow (learning, gardening, or a new skill/responsibility).
- Keep it small and doable in 15-30 minutes, not expensive, no special equipment most families don't have.
- NEVER mention weight, calories, dieting, or body size. Celebrate effort and fun, not results.
- NEVER compare them to other children.
- Tone: warm, playful, like a favorite camp counselor — not clinical, not bossy.

Respond with ONLY a JSON object, no other text, no markdown fences, in exactly this shape:
{"pillar": "fuel" | "move" | "grow", "title": "a short punchy title, under 8 words", "description": "1-2 encouraging sentences describing the activity"}`;
}

/** POST /api/ai/suggest — { memberId, mood? } -> a personalized activity idea. */
export async function suggest(request, familyId, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return errorResponse(
      "The AI assistant isn't set up yet — ask whoever's helping you build this to add an API key.",
      500
    );
  }

  const body = await readJson(request);
  if (!body || !body.memberId) return errorResponse("Missing memberId.");

  const member = await env.DB.prepare("SELECT id, display_name, role, interests FROM members WHERE id = ? AND family_id = ?")
    .bind(body.memberId, familyId)
    .first();
  if (!member) return errorResponse("That family member wasn't found.", 404);

  const mood = typeof body.mood === "string" ? body.mood.trim().slice(0, 200) : "";

  let aiRes;
  try {
    aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: buildPrompt(member, mood) }],
      }),
    });
  } catch (err) {
    return errorResponse("Couldn't reach the AI service. Try again in a bit.", 502);
  }

  if (!aiRes.ok) {
    const errData = await aiRes.json().catch(() => ({}));
    return errorResponse(errData.error?.message || "The AI service had a problem. Try again in a bit.", 502);
  }

  const data = await aiRes.json();
  const text = (data.content || []).map((block) => block.text || "").join("").trim();

  let suggestion;
  try {
    suggestion = JSON.parse(text);
  } catch (err) {
    return errorResponse("The AI gave back something we couldn't understand. Try again.", 502);
  }

  if (!suggestion.title || !suggestion.description || !VALID_PILLARS.includes(suggestion.pillar)) {
    return errorResponse("The AI's answer wasn't quite right. Try again.", 502);
  }

  return json({ ok: true, suggestion });
}
