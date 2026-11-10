// Pictures for the demo Smith family's recipes. Made ONCE with Cloudflare's
// built-in AI and stored at a shared spot in the photo bucket (demo/…), then
// every new demo family just points at them — so a room full of visitors
// tapping "Try a demo family" is instant and doesn't use up the AI allowance.

const DEMO_PICTURES = {
  "Veggie Pizza Night": "homemade veggie pizza with capsicum, mushrooms, cherry tomatoes and melted mozzarella on a wooden board",
  "Overnight Oats with Berries": "a jar of overnight oats topped with greek yoghurt, fresh berries and a drizzle of honey",
  "Rainbow Wraps": "colourful wholemeal wraps cut in half filled with hummus, grated carrot, spinach, cucumber and cheese",
  "Fruit Kebabs": "kids fruit kebabs with strawberries, grapes, melon and banana on skewers",
  "Chicken & Veggie Stir-fry": "chicken and vegetable stir-fry with broccoli, carrot and snow peas over rice",
  "Jack's Dino Lunchbox": "a kid's lunchbox with a cheese sandwich, apple slices, carrot sticks and a yoghurt pouch",
};

function keyFor(title) {
  return "demo/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + ".jpg";
}

async function makePicture(env, description) {
  const prompt = `A warm, appetizing, realistic food photograph of ${description}, on a home kitchen table, natural light, no text, no people, no logos.`;
  const out = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt, steps: 6 });
  if (!out || !out.image) throw new Error("no image");
  return Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
}

/**
 * Gives a new demo family's recipes their pictures. Pictures that already
 * exist are attached straight away; any missing one is made (once, for
 * everyone) and then attached. Best-effort — the demo works without them.
 */
export async function attachDemoPictures(env, familyId, newId) {
  if (!env.PHOTOS) return;
  const rows = await env.DB.prepare("SELECT id, title FROM recipes WHERE family_id = ?").bind(familyId).all();
  const day = new Date().toISOString().slice(0, 10);
  for (const r of rows.results || []) {
    const description = DEMO_PICTURES[r.title];
    if (!description) continue;
    const key = keyFor(r.title);
    try {
      let exists = await env.PHOTOS.head(key);
      if (!exists) {
        if (!env.AI) continue;
        await env.PHOTOS.put(key, await makePicture(env, description), { httpMetadata: { contentType: "image/jpeg" } });
        exists = true;
      }
      await env.DB.prepare(
        "INSERT INTO cookbook_photos (id, family_id, recipe_id, r2_key, content_type, source, day) VALUES (?, ?, ?, ?, 'image/jpeg', 'ai', ?)"
      ).bind(newId(), familyId, r.id, key, day).run();
    } catch (err) {
      // skip this one — the recipe just shows without a picture
    }
  }
}

export function isSharedDemoPicture(r2Key) {
  return typeof r2Key === "string" && r2Key.startsWith("demo/");
}
