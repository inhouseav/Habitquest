// "Family favourites" recipe pack: the Walker family's own favourites
// (starred) plus popular, healthy-ish Aussie family meals and lunchboxes.
// Added with one tap from the Recipes card; anything the family already
// has (same name) is skipped.

export const AUSSIE_FAMILY_PACK = [
  // --- The Walkers' favourites (⭐) ---
  { title: "Taco Tuesday", category: "dinner", favorite: 1,
    ingredients: ["500g beef or chicken mince", "1 packet taco seasoning (or cumin, paprika, garlic)", "8 small tortillas or taco shells", "1 cup shredded lettuce", "2 tomatoes, diced", "1 cup grated cheese", "1 avocado", "Natural yoghurt or sour cream"],
    steps: ["Brown the mince in a pan, then stir in the seasoning and a splash of water", "Chop the lettuce, tomatoes and avocado into bowls", "Warm the tortillas or shells", "Everyone builds their own tacos at the table!"] },
  { title: "Oats with Berries", category: "breakfast", favorite: 1,
    ingredients: ["1 cup rolled oats", "1 cup milk", "1/2 cup Greek yoghurt", "1 cup mixed berries (fresh or frozen)", "1 tsp honey"],
    steps: ["Mix the oats and milk in a jar (overnight in the fridge, or warm it up for 2 minutes)", "Spoon yoghurt on top", "Add berries and a little drizzle of honey"] },
  { title: "Cheese & Veggie Omelette", category: "breakfast", favorite: 1,
    ingredients: ["2 eggs", "Splash of milk", "1/4 capsicum, diced", "Handful of baby spinach", "2 tbsp grated cheese", "Small knob of butter"],
    steps: ["Whisk the eggs and milk with a fork", "Melt the butter in a pan on medium heat", "Pour in the eggs and let them set for a minute", "Sprinkle on capsicum, spinach and cheese", "Fold in half and slide onto a plate"] },
  { title: "Chicken Schnitzel with Veg", category: "dinner", favorite: 1,
    ingredients: ["2 chicken breasts, sliced thin", "1 cup breadcrumbs (or panko)", "1 egg", "1/2 cup flour", "Olive oil", "Broccoli, carrots and peas", "Potatoes for mash (optional)", "Lemon wedges"],
    steps: ["Set up 3 bowls: flour, beaten egg, breadcrumbs", "Coat each piece of chicken in flour, then egg, then crumbs", "Pan-fry in a little oil for 4–5 minutes each side until golden and cooked through", "Steam the veggies while the chicken cooks", "Serve with lemon and mash or salad"] },
  { title: "Steak with Veg", category: "dinner", favorite: 1,
    ingredients: ["4 small beef steaks (rump or sirloin)", "Olive oil, salt and pepper", "Baby potatoes", "Green beans or broccolini", "Carrots", "Cherry tomatoes"],
    steps: ["Boil or roast the potatoes until soft", "Rub the steaks with oil, salt and pepper", "Cook on a hot pan or BBQ for 3–4 minutes each side (a grown-up job!)", "Rest the steaks for 5 minutes while you steam the veg", "Slice and serve with the veggies"] },
  { title: "Lunchbox: Sandwich, Apple & Muesli Bar", category: "lunchboxes", favorite: 1,
    ingredients: ["Wholemeal sandwich (ham & cheese, or cheese & lettuce)", "1 apple", "1 muesli bar", "Capsicum sticks", "Water bottle"],
    steps: ["Make the sandwich and cut it in half", "Slice the capsicum into sticks", "Pack it all into the lunchbox with the apple and muesli bar"] },

  // --- Popular Aussie family breakfasts ---
  { title: "Smashed Avo on Toast", category: "breakfast", favorite: 0,
    ingredients: ["2 slices wholegrain toast", "1 avocado", "Squeeze of lemon", "Cherry tomatoes", "Crumbled feta (optional)"],
    steps: ["Toast the bread", "Mash the avocado with a fork and a squeeze of lemon", "Spread on toast and top with tomatoes and feta"] },
  { title: "Weet-Bix with Banana", category: "breakfast", favorite: 0,
    ingredients: ["2 Weet-Bix", "Milk", "1 banana, sliced", "Sprinkle of cinnamon"],
    steps: ["Put the Weet-Bix in a bowl", "Pour over milk", "Top with banana slices and a sprinkle of cinnamon"] },
  { title: "Banana Pikelets", category: "breakfast", favorite: 0,
    ingredients: ["1 ripe banana", "1 egg", "1/2 cup self-raising flour", "1/2 cup milk", "Butter for the pan", "Berries and yoghurt to serve"],
    steps: ["Mash the banana, then whisk in the egg and milk", "Stir in the flour until just mixed", "Cook spoonfuls in a buttered pan until bubbles appear, then flip", "Serve with berries and yoghurt"] },

  // --- Dinners ---
  { title: "Spag Bol", category: "dinner", favorite: 0,
    ingredients: ["500g beef mince", "1 onion", "1 carrot and 1 zucchini, grated", "700g jar passata", "1 tsp dried Italian herbs", "Spaghetti", "Grated parmesan"],
    steps: ["Cook the onion, then brown the mince", "Add the grated carrot and zucchini (hidden veg!)", "Pour in the passata and herbs, simmer for 20 minutes", "Cook the spaghetti and serve with the sauce and parmesan"] },
  { title: "Snag Sizzle Night", category: "dinner", favorite: 0,
    ingredients: ["8 sausages", "1 onion, sliced", "Wholemeal bread or rolls", "Salad: lettuce, tomato, cucumber, carrot", "Tomato sauce"],
    steps: ["Cook the sausages on the BBQ or in a pan, turning often", "Fry the onion until soft and golden", "Make a big salad together", "Serve sausages in bread with onions and salad on the side"] },
  { title: "Chicken & Veggie Fried Rice", category: "dinner", favorite: 0,
    ingredients: ["3 cups cooked rice (day-old is best)", "2 chicken thighs, diced", "2 eggs", "1 cup frozen peas & corn", "1 carrot, diced", "2 spring onions", "2 tbsp soy sauce"],
    steps: ["Cook the chicken in a hot pan until done, set aside", "Scramble the eggs, set aside", "Stir-fry the veggies for 3 minutes", "Add the rice, chicken, egg and soy sauce, toss until hot"] },
  { title: "San Choy Bow", category: "dinner", favorite: 0,
    ingredients: ["500g pork or chicken mince", "1 tin water chestnuts, chopped", "1 carrot, grated", "2 tbsp soy sauce", "1 tbsp oyster sauce", "Iceberg lettuce cups"],
    steps: ["Brown the mince in a pan", "Add carrot, water chestnuts and sauces, cook 5 minutes", "Spoon into lettuce cups and eat with your hands!"] },
  { title: "Lamb Chops with Mash & Peas", category: "dinner", favorite: 0,
    ingredients: ["8 lamb loin chops", "4 potatoes", "Splash of milk and butter", "2 cups peas", "Rosemary, salt and pepper"],
    steps: ["Boil the potatoes and mash with milk and butter", "Season the chops with rosemary, salt and pepper", "Pan-fry or BBQ 3–4 minutes each side", "Cook the peas and serve it all together"] },
  { title: "Homemade Fish & Chips", category: "dinner", favorite: 0,
    ingredients: ["4 white fish fillets (flathead or barramundi)", "1 cup breadcrumbs", "1 egg", "4 potatoes cut into chips", "Olive oil", "Lemon and salad to serve"],
    steps: ["Toss the chips in oil and bake at 220°C for 30 minutes", "Dip the fish in egg, then breadcrumbs", "Bake the fish for the last 12–15 minutes", "Serve with lemon and a simple salad"] },

  // --- Lunch & lunchboxes ---
  { title: "Zucchini Slice", category: "lunch", favorite: 0,
    ingredients: ["2 zucchini, grated", "1 carrot, grated", "1 onion, diced", "1 cup grated cheese", "5 eggs", "1 cup self-raising flour", "Splash of milk"],
    steps: ["Heat the oven to 180°C and line a tray", "Mix everything together in a big bowl", "Pour into the tray and bake for 30–35 minutes", "Cool, cut into squares — great in lunchboxes too"] },
  { title: "Homemade Sausage Rolls (with hidden veg)", category: "lunch", favorite: 0,
    ingredients: ["500g pork or chicken mince", "1 carrot and 1 zucchini, grated", "1/2 cup breadcrumbs", "1 egg", "3 sheets puff pastry", "Sesame seeds"],
    steps: ["Mix the mince, veg, breadcrumbs and egg", "Lay a sausage of mixture along each pastry sheet and roll up", "Cut into pieces, brush with egg, sprinkle seeds", "Bake at 200°C for 25 minutes"] },
  { title: "Lunchbox: Wrap, Grapes & Cheese", category: "lunchboxes", favorite: 0,
    ingredients: ["Wholemeal wrap with chicken, lettuce and grated carrot", "Small bunch of grapes", "Cheese cubes", "Cucumber sticks", "Water bottle"],
    steps: ["Fill and roll the wrap, cut in half", "Pack the grapes, cheese and cucumber in little sections"] },
  { title: "Lunchbox: Vegemite Sandwich & Veggie Sticks", category: "lunchboxes", favorite: 0,
    ingredients: ["Vegemite & cheese sandwich on wholemeal", "Carrot and capsicum sticks", "Cherry tomatoes", "Yoghurt pouch", "1 mandarin or banana"],
    steps: ["Make the sandwich", "Cut the veggies into sticks", "Pack with the yoghurt and fruit"] },

  // --- Snacks ---
  { title: "Vegemite Cheese Scrolls", category: "snacks", favorite: 0,
    ingredients: ["1 sheet puff pastry (or simple scone dough)", "1 tbsp Vegemite", "1 cup grated cheese"],
    steps: ["Spread a thin layer of Vegemite over the pastry", "Sprinkle with cheese and roll up tightly", "Slice into rounds and bake at 200°C for 15 minutes"] },
  { title: "Rainbow Fruit Salad", category: "snacks", favorite: 0,
    ingredients: ["Strawberries", "Mandarin or orange", "Pineapple", "Kiwi fruit", "Blueberries", "Passionfruit"],
    steps: ["Wash and chop the fruit into bite-size pieces", "Mix in a big bowl", "Spoon passionfruit over the top"] },
  { title: "Apple Slices with Peanut Butter", category: "snacks", favorite: 0,
    ingredients: ["1 apple", "1 tbsp peanut butter (or a nut-free spread for school)", "Sprinkle of oats or sultanas"],
    steps: ["Slice the apple into rounds or wedges", "Spread a little peanut butter on each", "Sprinkle with oats or sultanas"] },
];

/** Adds the pack to a family, skipping any recipe title they already have. */
export async function addRecipePack(db, familyId, newId) {
  const existing = await db.prepare("SELECT LOWER(title) AS t FROM recipes WHERE family_id = ?").bind(familyId).all();
  const have = new Set((existing.results || []).map((r) => r.t));
  const added = [];
  const skipped = [];
  for (const r of AUSSIE_FAMILY_PACK) {
    const lower = r.title.toLowerCase();
    // "Oats with Berries" ≈ an existing "overnight oats with berries" etc.
    const match = [...have].find((t) => t === lower || t.includes(lower) || lower.includes(t));
    if (match) {
      // Already have it — but if it's one of the family's favourites, star it.
      if (r.favorite) await db.prepare("UPDATE recipes SET favorite = 1 WHERE family_id = ? AND LOWER(title) = ?").bind(familyId, match).run();
      skipped.push(r.title);
      continue;
    }
    const id = newId();
    await db
      .prepare("INSERT INTO recipes (id, family_id, title, ingredients, steps, category, favorite) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id, familyId, r.title, JSON.stringify(r.ingredients), JSON.stringify(r.steps), r.category, r.favorite)
      .run();
    added.push({ id, title: r.title, favorite: !!r.favorite });
  }
  return { added, skipped };
}
