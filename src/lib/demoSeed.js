// Builds a complete, realistic demo family ("The Smith Family") whose dates
// are worked out from the visitor's own "today", so the demo is never stale:
// this week's calendar is full, Mia is on a 4-day streak with 2 of today's 3
// habits done (tick the last one to watch her win the day live), stars are
// in the bank for the Reward shop, and recipes/meals/shopping are filled in.
//
// Every tap of "Try a demo family" makes a brand-new private copy, so a room
// full of people can each poke at their own without breaking anyone else's.

import { hashPin, newId, newJoinCode } from "./crypto.js";
import { VALID_COLORS } from "../routes/members.js";
import { ensureBonusTables, ensureWeeklyGoals, ensureRewardColumns, ensureMemberStatus } from "./schemaUpgrades.js";
import { ensureDinners } from "../routes/dinners.js";
import { ensureCountdown } from "../routes/events.js";
import { ensureRecipeNotes } from "../routes/recipes.js";

export const DEMO_PIN = "0000";
export const DEMO_FAMILY_NAME = "The Smith Family";

function addDays(day, n) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mondayOf(day) {
  const d = new Date(day + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

/** A local clock time on a local day -> the UTC ISO string the app stores. */
function localToIso(day, hhmm, tzOffsetMinutes) {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) + tzOffsetMinutes * 60000).toISOString();
}

/**
 * Creates the demo family and returns { familyId, joinCode }.
 * today: the visitor's local date (YYYY-MM-DD).
 * tzOffsetMinutes: the visitor's Date#getTimezoneOffset() (e.g. -660 in Sydney).
 */
export async function seedDemoFamily(db, opts) {
  const { today, tzOffsetMinutes = 0 } = opts;
  const M = mondayOf(today); // Monday of this week
  const at = (day, hhmm) => localToIso(day, hhmm, tzOffsetMinutes);
  const s = []; // every statement, run together in one batch (all-or-nothing)
  const add = (sql, ...args) => s.push(db.prepare(sql).bind(...args));

  // --- Family (unique join code) ---
  let joinCode = null;
  for (let i = 0; i < 6 && !joinCode; i++) {
    const c = newJoinCode();
    if (!(await db.prepare("SELECT id FROM families WHERE join_code = ?").bind(c).first())) joinCode = c;
  }
  if (!joinCode) throw new Error("Could not make a join code, please try again.");
  const familyId = newId();
  add("INSERT INTO families (id, name, pin_hash, join_code) VALUES (?, ?, ?, ?)", familyId, DEMO_FAMILY_NAME, await hashPin(DEMO_PIN), joinCode);

  // --- Members (created_at staggered so they always list in this order) ---
  const sam = newId(), mia = newId(), jack = newId();
  const members = [
    [sam, "Sam", "parent", VALID_COLORS[0], ["cook", "garden", "outside"]],
    [mia, "Mia", "child", VALID_COLORS[1], ["sport", "bake", "dance", "art"]],
    [jack, "Jack", "child", VALID_COLORS[2], ["animals", "bike", "build", "sport"]],
  ];
  members.forEach(([id, name, role, color, interests], i) =>
    add("INSERT INTO members (id, family_id, display_name, role, color, interests, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))",
      id, familyId, name, role, color, JSON.stringify(interests), `+${i} seconds`));

  // --- Each person's 3 habits for the week ---
  const H = {};
  const habits = [
    [sam, 1, "Morning walk", "🚶"], [sam, 2, "Cook a new veggie", "🥦"], [sam, 3, "Phone-free dinner", "📵"],
    [mia, 1, "Netball practice", "🏐"], [mia, 2, "Help make dinner", "🍳"], [mia, 3, "Make my bed", "🛏️"],
    [jack, 1, "Ride my bike", "🚲"], [jack, 2, "Pack my lunchbox", "🥪"], [jack, 3, "Feed the dog", "🐶"],
  ];
  habits.forEach(([member, slot, title, emoji]) => {
    const id = newId();
    H[`${member}:${slot}`] = { id, title };
    add("INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES (?, ?, ?, ?, ?, ?)", id, familyId, member, slot, title, emoji);
  });

  // --- Ticked-off habits (each earns a star, exactly like the real app) ---
  const tick = (member, slot, day) => {
    const h = H[`${member}:${slot}`];
    const ledgerId = newId();
    add("INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES (?, ?, ?, 1, ?, ?)",
      ledgerId, familyId, member, `Did "${h.title}" on ${day}`, `habit:${h.id}:${day}`);
    add("INSERT INTO habit_completions (id, habit_id, member_id, family_id, day, star_ledger_id) VALUES (?, ?, ?, ?, ?, ?)",
      newId(), h.id, member, familyId, day, ledgerId);
  };
  // Mia: won the last 4 days, 2 of 3 done today -> tick "Make my bed" live for a 5-day streak.
  for (let back = 4; back >= 1; back--) [1, 2, 3].forEach((slot) => tick(mia, slot, addDays(today, -back)));
  tick(mia, 1, today); tick(mia, 2, today);
  // Jack: won 3 days ago, nearly yesterday, 1 done today -> "So close!"
  [1, 2, 3].forEach((slot) => tick(jack, slot, addDays(today, -3)));
  tick(jack, 1, addDays(today, -1)); tick(jack, 3, addDays(today, -1));
  tick(jack, 1, today);
  // Sam: won yesterday, nothing yet today.
  [1, 2, 3].forEach((slot) => tick(sam, slot, addDays(today, -1)));

  add("INSERT INTO habit_streaks (member_id, current_streak, longest_streak, last_won_day) VALUES (?, ?, ?, ?)", mia, 4, 6, addDays(today, -1));
  add("INSERT INTO habit_streaks (member_id, current_streak, longest_streak, last_won_day) VALUES (?, ?, ?, ?)", jack, 0, 3, addDays(today, -3));
  add("INSERT INTO habit_streaks (member_id, current_streak, longest_streak, last_won_day) VALUES (?, ?, ?, ?)", sam, 1, 2, addDays(today, -1));

  // Kudos from Sam (a parent) today — same shape the real kudos route uses.
  [[mia, "Kudos from a parent"], [jack, "Kudos from a parent"]].forEach(([member, reason]) =>
    add("INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES (?, ?, ?, 1, ?, ?)",
      newId(), familyId, member, reason, `kudos:1:${member}:${today}`));

  // --- Bonus habits (only if this database has them set up) ---
  if (await ensureBonusTables(db)) {
    const bonusRead = newId();
    add("INSERT INTO bonus_habits (id, family_id, member_id, slot, title, emoji) VALUES (?, ?, ?, ?, ?, ?)", bonusRead, familyId, mia, 4, "Read for 15 mins", "📚");
    add("INSERT INTO bonus_habits (id, family_id, member_id, slot, title, emoji) VALUES (?, ?, ?, ?, ?, ?)", newId(), familyId, jack, 4, "Practise piano", "🎹");
    add("INSERT INTO bonus_completions (id, bonus_habit_id, member_id, family_id, day) VALUES (?, ?, ?, ?, ?)",
      newId(), bonusRead, mia, familyId, addDays(today, -1));
  }

  // --- Rewards (weekly prizes) + what each kid is working towards ---
  const rewardIds = {};
  [["breakfast", "Choose Saturday breakfast 🥞"], ["movie", "Pick the movie for movie night 🎬"], ["park", "Extra 30 minutes at the park 🛝"]]
    .forEach(([key, title]) => {
      rewardIds[key] = newId();
      add("INSERT INTO rewards (id, family_id, title, star_cost) VALUES (?, ?, ?, ?)", rewardIds[key], familyId, title, 12);
    });
  if (await ensureRewardColumns(db)) {
    add("INSERT INTO rewards (id, family_id, title, star_cost, member_id, status, created_by) VALUES (?, ?, ?, ?, ?, 'pending', ?)", newId(), familyId, "Trampoline park 🤸", 12, jack, jack);
  }
  if (await ensureWeeklyGoals(db)) {
    add("INSERT INTO weekly_goals (id, family_id, member_id, week_of, reward_id) VALUES (?, ?, ?, ?, ?)", newId(), familyId, mia, M, rewardIds.movie);
    add("INSERT INTO weekly_goals (id, family_id, member_id, week_of, reward_id) VALUES (?, ?, ?, ?, ?)", newId(), familyId, jack, M, rewardIds.park);
  }

  // --- Planner ideas, most-used first ---
  [["Netball practice", "movement", 6], ["Family bike ride", "movement", 4], ["Backyard cricket", "movement", 2], ["Scooter to school", "movement", 1],
   ["Feed the dog", "home", 7], ["Make my bed", "home", 5], ["Set the table", "home", 3], ["Water the veggie patch", "home", 1]]
    .forEach(([title, category, uses]) =>
      add("INSERT INTO movement_ideas (id, family_id, title, category, use_count) VALUES (?, ?, ?, ?, ?)", newId(), familyId, title, category, uses));

  // --- This week's calendar (plus one repeating and one next-week event) ---
  const ev = (dayOffset, time, member, title, pillar, recurrence = null) =>
    add("INSERT INTO events (id, family_id, member_id, title, pillar, starts_at, recurrence) VALUES (?, ?, ?, ?, ?, ?, ?)",
      newId(), familyId, member, title, pillar, at(addDays(M, dayOffset), time), recurrence ? JSON.stringify(recurrence) : null);
  ev(0, "07:00", sam, "Morning walk", "move");
  ev(0, "16:30", jack, "Soccer training", "move");
  ev(1, "16:00", mia, "Netball training", "move", { freq: "weekly", until: addDays(M, 90) });
  ev(1, "17:30", null, "Grocery shop together", "fuel");
  ev(2, "15:30", mia, "Baking club", "grow");
  ev(2, "16:30", jack, "Bike ride to the park", "move");
  ev(3, "06:30", sam, "Yoga", "move");
  ev(3, "15:30", jack, "Lego club", "grow");
  ev(3, "18:00", null, "Family dinner together", "fuel");
  ev(4, "17:00", mia, "Netball game", "move");
  ev(4, "19:00", null, "Movie night 🍿", "fuel");
  ev(5, "08:30", null, "Farmers market", "fuel");
  ev(5, "10:30", null, "Park playdate", "move");
  ev(5, "14:00", mia, "Drawing class", "grow");
  ev(6, "11:00", null, "Plant the veggie patch", "grow");
  ev(6, "13:00", jack, "Dinosaur museum trip", "grow");
  ev(12, "10:00", null, "Family bike ride", "move");
  ev(0, "07:30", jack, "Feed the fish", "grow", { freq: "daily", until: addDays(M, 60) });
  const countdownOk = await ensureCountdown(db);
  const beachId = newId();
  add("INSERT INTO events (id, family_id, member_id, title, pillar, starts_at, recurrence) VALUES (?, ?, NULL, ?, 'move', ?, NULL)",
    beachId, familyId, "🏖️ Beach holiday", at(addDays(today, 16), "09:00"));
  if (countdownOk) add("UPDATE events SET countdown = 1 WHERE id = ?", beachId);

  // --- Habits planned onto days ("Plan my week") ---
  [[mia, 1, 1], [mia, 1, 4], [jack, 1, 2], [jack, 1, 5], [sam, 1, 0], [sam, 1, 3], [sam, 2, 2]]
    .forEach(([member, slot, offset]) =>
      add("INSERT INTO habit_day_plan (id, family_id, member_id, slot, day) VALUES (?, ?, ?, ?, ?)", newId(), familyId, member, slot, addDays(M, offset)));

  // --- Recipes ---
  const R = {};
  [["pizza", "Veggie Pizza Night", "dinner", 1, ["4 pizza bases", "1/2 cup tomato paste", "200g mozzarella, grated", "1 capsicum, sliced", "6 mushrooms, sliced", "1 cup cherry tomatoes"], ["Spread tomato paste on the bases", "Everyone adds their own toppings", "Bake at 220°C for 12 minutes (a grown-up job for the oven!)"]],
   ["oats", "Overnight Oats with Berries", "breakfast", 1, ["2 cups rolled oats", "2 cups milk", "1 cup Greek yoghurt", "2 cups berries", "2 tsp honey"], ["Mix oats and milk in a jar", "Leave in the fridge overnight", "Top with yoghurt, berries and a drizzle of honey"]],
   ["wraps", "Rainbow Wraps", "lunch", 1, ["4 wraps", "1/2 cup hummus", "1 carrot, grated", "2 handfuls spinach", "1 cucumber, sliced", "1 cup grated cheese"], ["Spread hummus on a wrap", "Add a stripe of every colour", "Roll up tight and cut in half"]],
   ["kebabs", "Fruit Kebabs", "snacks", 0, ["1 punnet strawberries", "1 cup grapes", "1/4 melon", "2 bananas"], ["Cut the fruit into chunks", "Thread onto skewers in a pattern"]],
   ["stirfry", "Chicken & Veggie Stir-fry", "dinner", 0, ["500g chicken, sliced", "1 head broccoli", "2 carrots", "1 cup snow peas", "2 tbsp soy sauce", "2 cups rice"], ["Cook the rice", "Stir-fry the chicken until golden (grown-up helper!)", "Add the veggies and soy sauce for 3 minutes"]],
   ["tacos", "Taco Tuesday", "dinner", 1, ["500g beef mince", "1 packet taco seasoning", "8 small tortillas", "1 cup shredded lettuce", "2 tomatoes, diced", "1 cup grated cheese", "1 avocado"], ["Brown the mince in a pan, then stir in the seasoning", "Chop the lettuce, tomatoes and avocado into bowls", "Warm the tortillas", "Everyone builds their own tacos at the table!"]],
   ["spag", "Spag Bol", "dinner", 0, ["500g beef mince", "1 onion", "1 carrot, grated", "1 zucchini, grated", "700g jar passata", "400g spaghetti", "Grated parmesan"], ["Cook the onion, then brown the mince", "Stir in the grated carrot and zucchini (hidden veg!)", "Pour in the passata and simmer for 20 minutes", "Cook the spaghetti and serve with the sauce"]],
   ["pikelets", "Banana Pikelets", "breakfast", 0, ["2 ripe bananas", "2 eggs", "1 cup self-raising flour", "1 cup milk", "Butter for the pan"], ["Mash the bananas, then whisk in the eggs and milk", "Stir in the flour until just mixed", "Cook spoonfuls in a buttered pan, flip when bubbly"]],
   ["lunchbox", "Jack's Dino Lunchbox", "lunchboxes", 0, ["Cheese sandwich", "Apple slices", "Carrot sticks", "Yoghurt pouch"], ["Pack it all into the lunchbox!"]]]
    .forEach(([key, title, category, favorite, ingredients, steps]) => {
      R[key] = { id: newId(), title };
      add("INSERT INTO recipes (id, family_id, title, ingredients, steps, category, favorite) VALUES (?, ?, ?, ?, ?, ?, ?)",
        R[key].id, familyId, title, JSON.stringify(ingredients), JSON.stringify(steps), category, favorite);
    });

  // --- This week's meals (two eaten together, one with votes) ---
  const meal = (offset, key, title, type, together = 0, votes = []) =>
    add("INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, meal_type, together, votes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      newId(), familyId, addDays(M, offset), key ? R[key].id : null, key ? R[key].title : title, type, together, JSON.stringify(votes));
  meal(0, "oats", null, "breakfast");
  meal(1, "wraps", null, "lunch");
  meal(1, "lunchbox", null, "lunch");
  meal(4, "kebabs", null, "snacks");
  // 🍽️ Dinners: kids pick, parent locks. Tonight is Mia's pizza pick
  // (tap 👩‍🍳 Cook), Jack has picked tacos, and a couple of nights are left
  // free so visitors can drag a recipe on themselves. Not locked yet.
  const dinnersOk = await ensureDinners(db);
  const t = Math.round((Date.parse(today) - Date.parse(M)) / 86400000); // today's index (0 = Mon)
  const free = new Set([t + 1, t + 3].filter((x) => x <= 6));
  const plan = [["spag", sam], ["stirfry", sam], ["tacos", jack], ["pizza", mia], [null, null], ["stirfry", sam], ["spag", sam]];
  plan[t] = ["pizza", mia];
  if (t !== 2 && !free.has(2)) plan[2] = ["tacos", jack];
  else { const j = [0, 1, 2, 3, 4, 5, 6].find((i) => i !== t && !free.has(i) && i > t) ?? [0, 1, 2, 3, 4, 5, 6].find((i) => i !== t && !free.has(i)); plan[j] = ["tacos", jack]; }
  plan.forEach(([key, by], i) => {
    if (free.has(i)) return;
    const day = addDays(M, i);
    if (i === 5 && key === null) { add("INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, meal_type, together, votes) VALUES (?, ?, ?, NULL, ?, 'dinner', 1, '[]')", newId(), familyId, day, "BBQ at Grandma's"); return; }
    if (!key) return;
    if (dinnersOk) add("INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, meal_type, together, votes, picked_by) VALUES (?, ?, ?, ?, ?, 'dinner', 1, '[]', ?)", newId(), familyId, day, R[key].id, R[key].title, by);
    else add("INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, meal_type, together, votes) VALUES (?, ?, ?, ?, ?, 'dinner', 1, '[]')", newId(), familyId, day, R[key].id, R[key].title);
  });
  // Recipes planned in earlier weeks, so "most cooked first" has a story.
  [["tacos", 7], ["tacos", 14], ["pizza", 9], ["pizza", 16], ["spag", 10], ["oats", 8]].forEach(([key, back]) =>
    add("INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, meal_type, together, votes) VALUES (?, ?, ?, ?, ?, 'dinner', 1, '[]')", newId(), familyId, addDays(M, -back), R[key].id, R[key].title));

  // 💬 Why we love it (goes in the printed cookbook)
  if (await ensureRecipeNotes(db)) {
    [["tacos", "Every Tuesday we all build our own tacos — Jack piles on SO much cheese! 🧀"],
     ["pizza", "Mia invented the smiley-face pizza. Everyone makes their own, so nobody argues about toppings 🍕"],
     ["oats", "We make them the night before, so school mornings are easy and yummy 🫐"],
     ["spag", "Dad's secret: hidden veggies! Jack still hasn't noticed the zucchini 🤫"]]
      .forEach(([key, why]) => add("INSERT INTO recipe_notes (family_id, recipe_id, why) VALUES (?, ?, ?)", familyId, R[key].id, why));
  }

  // 😎 Avatars + ❤️ favourites (Family → tap a name)
  if (await ensureMemberStatus(db)) {
    const fav = (id, avatar, f) => add("UPDATE members SET avatar = ?, favorites = ? WHERE id = ?", avatar, JSON.stringify(f), id);
    fav(sam, "🦉", { move: ["Morning walk", "Family bike ride"], cook: ["Cook a new veggie"], home: ["Phone-free dinner", "Water the veggie patch"], recipes: [R.stirfry.id, R.tacos.id, R.spag.id], lunchbox: [] });
    fav(mia, "🦊", { move: ["Netball practice", "Dance party — 3 songs"], cook: ["Help make dinner", "Bake a healthy snack"], home: ["Make my bed"], recipes: [R.pizza.id, R.tacos.id, R.wraps.id, R.oats.id], lunchbox: ["🍎 Apple slices", "🧀 Cheese cubes", "🫐 Berries"] });
    fav(jack, "🦖", { move: ["Ride my bike", "Backyard cricket"], cook: ["Pack my lunchbox"], home: ["Feed the dog"], recipes: [R.tacos.id, R.pizza.id, R.pikelets.id], lunchbox: ["🥪 Sandwich", "🥕 Carrot sticks", "🥛 Yoghurt"] });
  }

  // --- Shopping list ---
  [["Bananas", 0], ["Milk", 0], ["Dragon fruit (for Jack to try)", 0], ["Pomegranate (for Mia to try)", 0], ["Bread", 1], ["2 cups rolled oats", 1]]
    .forEach(([name, checked]) => add("INSERT INTO shopping_items (id, family_id, name, checked) VALUES (?, ?, ?, ?)", newId(), familyId, name, checked));

  // --- This week's family check-in notes ---
  add("INSERT INTO family_meetings (id, family_id, week_of, notes) VALUES (?, ?, ?, ?)", newId(), familyId, M,
    "🎉 Wins: Mia won 4 days in a row! Jack fed the dog every day.\n🥦 Try a new food: snow peas in the stir-fry.\n🌱 Next week: plant the veggie patch together.");

  // --- Food Explorer Passport stamps (earlier days, so today's bonus is still up for grabs) ---
  if (opts.withPassport) {
    const stamp = (member, emoji, food, verdict, back) =>
      add("INSERT INTO food_passport (id, family_id, member_id, food_key, food_name, emoji, verdict, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        newId(), familyId, member, food.toLowerCase(), food, emoji, verdict, addDays(today, -back));
    stamp(mia, "🥝", "Kiwi fruit", "love", 9); stamp(mia, "🫛", "Snow peas", "ok", 6); stamp(mia, "🥑", "Avocado", "love", 4);
    stamp(mia, "🍄", "Mushroom", "not_yet", 2);
    stamp(jack, "🥭", "Mango", "love", 5); stamp(jack, "🌽", "Corn", "love", 3); stamp(jack, "🥦", "Broccoli", "not_yet", 1);
    stamp(sam, "🐟", "Salmon", "ok", 7); stamp(sam, "🍆", "Eggplant", "love", 2);
    // 🛒 Want to try (on the shopping list)
    add("INSERT INTO food_wishlist (id, family_id, member_id, food_key, food_name, emoji) VALUES (?, ?, ?, ?, ?, ?)", newId(), familyId, jack, "dragon fruit", "Dragon fruit", "🐉");
    add("INSERT INTO food_wishlist (id, family_id, member_id, food_key, food_name, emoji) VALUES (?, ?, ?, ?, ?, ?)", newId(), familyId, mia, "pomegranate", "Pomegranate", "❤️");
  }

  await db.batch(s);
  return { familyId, joinCode };
}
