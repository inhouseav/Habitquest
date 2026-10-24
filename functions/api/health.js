// GET /api/health — real liveness check, used to confirm Pages Functions
// are actually deployed and running (not a mock). Also reports whether the
// D1 binding is wired up yet, so BUILD_STATUS.md can stay honest.
export async function onRequestGet(context) {
  const hasDb = !!context.env.DB;
  const hasPhotos = !!context.env.PHOTOS;

  let dbReachable = false;
  if (hasDb) {
    try {
      await context.env.DB.prepare("SELECT 1").first();
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
