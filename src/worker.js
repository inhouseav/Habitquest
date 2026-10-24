// Fuel the Fun — unified Worker entry point.
// Serves the static app (public/) and handles every /api/* route.

import { errorResponse, json } from "./lib/http.js";
import { getBearerToken, getFamilyIdForToken } from "./lib/sessions.js";
import * as familyRoutes from "./routes/family.js";
import * as memberRoutes from "./routes/members.js";
import * as eventRoutes from "./routes/events.js";
import * as starRoutes from "./routes/stars.js";
import * as dailyThreeRoutes from "./routes/dailyThree.js";
import * as rewardRoutes from "./routes/rewards.js";
import * as recipeRoutes from "./routes/recipes.js";
import * as mealPlanRoutes from "./routes/mealPlan.js";
import * as shoppingRoutes from "./routes/shopping.js";
import * as meetingRoutes from "./routes/meetings.js";
import * as pushRoutes from "./routes/push.js";
import * as googleCalendarRoutes from "./routes/googleCalendarRoutes.js";
import * as aiAssistantRoutes from "./routes/aiAssistant.js";

async function handleHealth(env) {
  const hasDb = !!env.DB;
  const hasPhotos = !!env.PHOTOS;

  let dbReachable = false;
  if (hasDb) {
    try {
      await env.DB.prepare("SELECT 1").first();
      dbReachable = true;
    } catch (err) {
      dbReachable = false;
    }
  }

  return json({
    ok: true,
    service: "habitquest-api",
    timestamp: new Date().toISOString(),
    db_binding_present: hasDb,
    db_reachable: dbReachable,
    photos_binding_present: hasPhotos,
  });
}

/** Resolves the logged-in family_id from the Authorization header, or sends a 401. */
async function requireFamily(request, env) {
  const token = getBearerToken(request);
  const familyId = await getFamilyIdForToken(env.DB, token);
  if (!familyId) return { familyId: null, response: errorResponse("Not logged in.", 401) };
  return { familyId, response: null };
}

async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // --- Public (no login required) ---
  if (path === "/api/health" && method === "GET") return handleHealth(env);
  if (path === "/api/family/signup" && method === "POST") return familyRoutes.signup(request, env);
  if (path === "/api/family/login" && method === "POST") return familyRoutes.login(request, env);
  if (path === "/api/push/public-key" && method === "GET") {
    return json({ ok: true, publicKey: env.VAPID_PUBLIC_KEY || null });
  }
  // Google redirects here with no session cookie/header, so this must stay public.
  if (path === "/api/calendar/google/callback" && method === "GET") {
    return googleCalendarRoutes.callback(request, env, url);
  }
  // This one is a full-page browser navigation (clicking a link), not a
  // fetch() call, so it can't carry an Authorization header — the session
  // token comes through as ?t= instead. Still fully real auth: the token
  // is just as secret, only delivered a different way for this one route.
  if (path === "/api/calendar/google/start" && method === "GET") {
    const token = url.searchParams.get("t");
    const familyId = await getFamilyIdForToken(env.DB, token);
    if (!familyId) return errorResponse("Not logged in.", 401);
    return googleCalendarRoutes.start(familyId, env, url);
  }

  // --- Everything below requires a logged-in family ---
  const { familyId, response } = await requireFamily(request, env);
  if (response) return response;

  if (path === "/api/me" && method === "GET") return familyRoutes.me(familyId, env);

  if (path === "/api/members" && method === "GET") return memberRoutes.listMembers(familyId, env);
  if (path === "/api/members" && method === "POST") return memberRoutes.addMember(request, familyId, env);

  if (path === "/api/events" && method === "GET") return eventRoutes.listEvents(familyId, env);
  if (path === "/api/events" && method === "POST") return eventRoutes.createEvent(request, familyId, env);
  const eventDeleteMatch = path.match(/^\/api\/events\/([^/]+)$/);
  if (eventDeleteMatch && method === "DELETE") {
    return eventRoutes.deleteEvent(eventDeleteMatch[1], familyId, env);
  }

  if (path === "/api/stars" && method === "GET") return starRoutes.getStars(request, familyId, env);
  if (path === "/api/stars" && method === "POST") return starRoutes.awardStars(request, familyId, env);

  if (path === "/api/daily-three" && method === "GET") return dailyThreeRoutes.getDailyThree(request, familyId, env);
  if (path === "/api/daily-three/complete" && method === "POST") {
    return dailyThreeRoutes.completePillar(request, familyId, env);
  }

  if (path === "/api/rewards" && method === "GET") return rewardRoutes.listRewards(familyId, env);
  if (path === "/api/rewards" && method === "POST") return rewardRoutes.createReward(request, familyId, env);
  const rewardRedeemMatch = path.match(/^\/api\/rewards\/([^/]+)\/redeem$/);
  if (rewardRedeemMatch && method === "POST") {
    return rewardRoutes.redeemReward(rewardRedeemMatch[1], request, familyId, env);
  }

  if (path === "/api/recipes" && method === "GET") return recipeRoutes.listRecipes(familyId, env);
  if (path === "/api/recipes" && method === "POST") return recipeRoutes.createRecipe(request, familyId, env);

  if (path === "/api/meal-plan" && method === "GET") return mealPlanRoutes.listMealPlan(request, familyId, env);
  if (path === "/api/meal-plan" && method === "POST") return mealPlanRoutes.proposeMeal(request, familyId, env);
  const mealVoteMatch = path.match(/^\/api\/meal-plan\/([^/]+)\/vote$/);
  if (mealVoteMatch && method === "POST") {
    return mealPlanRoutes.toggleVote(mealVoteMatch[1], request, familyId, env);
  }

  if (path === "/api/shopping" && method === "GET") return shoppingRoutes.listShoppingItems(familyId, env);
  if (path === "/api/shopping" && method === "POST") return shoppingRoutes.addShoppingItem(request, familyId, env);
  const shoppingToggleMatch = path.match(/^\/api\/shopping\/([^/]+)\/toggle$/);
  if (shoppingToggleMatch && method === "POST") {
    return shoppingRoutes.toggleShoppingItem(shoppingToggleMatch[1], familyId, env);
  }
  const shoppingDeleteMatch = path.match(/^\/api\/shopping\/([^/]+)$/);
  if (shoppingDeleteMatch && method === "DELETE") {
    return shoppingRoutes.deleteShoppingItem(shoppingDeleteMatch[1], familyId, env);
  }

  if (path === "/api/meetings" && method === "GET") return meetingRoutes.getMeeting(request, familyId, env);
  if (path === "/api/meetings" && method === "POST") return meetingRoutes.saveMeeting(request, familyId, env);

  if (path === "/api/push/subscribe" && method === "POST") return pushRoutes.subscribe(request, familyId, env);
  if (path === "/api/push/unsubscribe" && method === "POST") return pushRoutes.unsubscribe(request, familyId, env);
  if (path === "/api/push/test" && method === "POST") return pushRoutes.sendTest(request, familyId, env);

  if (path === "/api/calendar/google/status" && method === "GET") return googleCalendarRoutes.status(familyId, env);
  if (path === "/api/calendar/google/disconnect" && method === "POST") return googleCalendarRoutes.disconnect(familyId, env);

  if (path === "/api/ai/suggest" && method === "POST") return aiAssistantRoutes.suggest(request, familyId, env);

  return errorResponse("Not found.", 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return errorResponse(`Server error: ${err.message || err}`, 500);
      }
    }

    // Everything else is a static file (index.html, css, images, etc.)
    // served from the public/ folder via the ASSETS binding.
    return env.ASSETS.fetch(request);
  },
};
