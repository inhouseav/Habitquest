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
export async function seedDemoFamily(db, { today, tzOffsetMinutes = 0 }) {
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
    [sam, "Sam", "parent", VALID_COLORS[0], ["cooking", "running", "gardening"]],
    [mia, "Mia", "child", VALID_COLORS[1], ["netball", "baking", "drawing"]],
    [jack, "Jack", "child", VALID_COLORS[2], ["dinosaurs", "soccer", "lego"]],
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

  // A few kudos so the star totals feel lived-in.
  [[mia, 2, "Kudos from Sam — great teamwork at netball"], [jack, 2, "Kudos from Mia — helped tidy up"], [sam, 1, "Kudos from Jack — best pancakes"]]
    .forEach(([member, delta, reason]) =>
      add("INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES (?, ?, ?, ?, ?, ?)",
        newId(), familyId, member, delta, reason, `demo:${newId()}`));

  // --- Reward shop ---
  [["Choose Saturday breakfast 🥞", 8], ["Pick the movie for movie night 🎬", 12], ["Extra 30 minutes at the park 🛝", 5]]
    .forEach(([title, cost]) => add("INSERT INTO rewards (id, family_id, title, star_cost) VALUES (?, ?, ?, ?)", newId(), familyId, title, cost));

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

  // --- Habits planned onto days ("Plan my week") ---
  [[mia, 1, 1], [mia, 1, 4], [jack, 1, 2], [jack, 1, 5], [sam, 1, 0], [sam, 1, 3], [sam, 2, 2]]
    .forEach(([member, slot, offset]) =>
      add("INSERT INTO habit_day_plan (id, family_id, member_id, slot, day) VALUES (?, ?, ?, ?, ?)", newId(), familyId, member, slot, addDays(M, offset)));

  // --- Recipes ---
  const R = {};
  [["pizza", "Veggie Pizza Night", "dinner", 1, ["Pizza bases", "Tomato paste", "Mozzarella", "Capsicum", "Mushrooms", "Cherry tomatoes"], ["Spread tomato paste on the bases", "Everyone adds their own toppings", "Bake at 220°C for 12 minutes"]],
   ["oats", "Overnight Oats with Berries", "breakfast", 1, ["Rolled oats", "Milk", "Greek yoghurt", "Berries", "Honey"], ["Mix oats and milk in a jar", "Leave in the fridge overnight", "Top with yoghurt, berries and a drizzle of honey"]],
   ["wraps", "Rainbow Wraps", "lunch", 1, ["Wraps", "Hummus", "Grated carrot", "Spinach", "Cucumber", "Cheese"], ["Spread hummus on a wrap", "Add a stripe of every colour", "Roll up tight and cut in half"]],
   ["kebabs", "Fruit Kebabs", "snacks", 0, ["Strawberries", "Grapes", "Melon", "Banana"], ["Cut the fruit into chunks", "Thread onto skewers in a pattern"]],
   ["stirfry", "Chicken & Veggie Stir-fry", "dinner", 0, ["Chicken", "Broccoli", "Carrot", "Snow peas", "Soy sauce", "Rice"], ["Cook the rice", "Stir-fry the chicken until golden", "Add the veggies and soy sauce for 3 minutes"]],
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
  meal(2, "stirfry", null, "dinner", 0, [sam]);
  meal(3, "pizza", null, "dinner", 1, [mia, jack, sam]);
  meal(4, "kebabs", null, "snacks");
  meal(5, null, "BBQ at Grandma's", "dinner", 1);

  // --- Shopping list ---
  [["Pizza bases", 0], ["Mozzarella", 0], ["Capsicum", 0], ["Wraps", 0], ["Bananas", 0], ["Berries", 1], ["Rolled oats", 1]]
    .forEach(([name, checked]) => add("INSERT INTO shopping_items (id, family_id, name, checked) VALUES (?, ?, ?, ?)", newId(), familyId, name, checked));

  // --- This week's family check-in notes ---
  add("INSERT INTO family_meetings (id, family_id, week_of, notes) VALUES (?, ?, ?, ?)", newId(), familyId, M,
    "🎉 Wins: Mia won 4 days in a row! Jack fed the dog every day.\n🥦 Try a new food: snow peas in the stir-fry.\n🌱 Next week: plant the veggie patch together.");

  await db.batch(s);
  return { familyId, joinCode };
}
