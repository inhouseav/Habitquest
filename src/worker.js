// Fuel the Fun — unified Worker entry point.
// Cloudflare's current "Workers with assets" setup wants ONE worker script
// that both serves static files and handles API routes, instead of the
// older separate "Pages Functions" file-based routing. This does both.

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

  return new Response(
    JSON.stringify({
      ok: true,
      service: "habitquest-api",
      timestamp: new Date().toISOString(),
      db_binding_present: hasDb,
      db_reachable: dbReachable,
      photos_binding_present: hasPhotos,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return handleHealth(env);
    }

    // Everything else is a static file (index.html, css, images, etc.)
    // served from the public/ folder via the ASSETS binding.
    return env.ASSETS.fetch(request);
  },
};
