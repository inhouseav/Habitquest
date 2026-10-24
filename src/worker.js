// Fuel the Fun — unified Worker entry point.
// Serves the static app (public/) and handles every /api/* route.

import { errorResponse, json } from "./lib/http.js";
import { getBearerToken, getFamilyIdForToken } from "./lib/sessions.js";
import * as familyRoutes from "./routes/family.js";
import * as memberRoutes from "./routes/members.js";
import * as eventRoutes from "./routes/events.js";
import * as starRoutes from "./routes/stars.js";

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
