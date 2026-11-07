-- Demo family seed for presentations: "The Smith Family"
-- Join code: DEMO01   PIN: 0000
-- Safe to run anytime, delete anytime (see the DELETE block Claude will give you if you ever want to remove it).

INSERT INTO families (id, name, pin_hash, join_code) VALUES ('93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'The Smith Family', '100000.cc433e588202a275bf412cc82b72ee3d.9f545be9ed37aeb63d3683ff8026e2844b80eb5b2030ced040d5c633e4bf7c67', 'DEMO01');
INSERT INTO members (id, family_id, display_name, role, color, interests) VALUES ('f850b771-e653-4784-86ac-e3476c2c526b', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Sam', 'parent', '#BE7050', '["cooking","running"]');
INSERT INTO members (id, family_id, display_name, role, color, interests) VALUES ('82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Mia', 'child', '#7FA6A0', '["netball","baking","drawing"]');
INSERT INTO members (id, family_id, display_name, role, color, interests) VALUES ('fb2dfecc-2a90-4891-8055-68c328cbe362', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Jack', 'child', '#D9A441', '["dinosaurs","soccer","lego"]');

INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES ('81ea847f-f09a-4e5e-ab64-66a742094e69', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'f850b771-e653-4784-86ac-e3476c2c526b', 1, 'Family walk', '🚶');
INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES ('e343dd49-e1d9-4e87-afa4-12fc426825d8', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'f850b771-e653-4784-86ac-e3476c2c526b', 3, 'Tidy the kitchen', '🧹');
INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES ('7d5829c7-ebc7-4893-9924-86c1c2dbee6e', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '82650e3e-4c5e-4e0a-b166-58760d4daebc', 1, 'Netball practice', '🏐');
INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES ('1481facc-fc24-4f29-82a1-7a7540cb3ac6', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '82650e3e-4c5e-4e0a-b166-58760d4daebc', 2, 'Help make dinner', '🍳');
INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES ('3720c493-d4cd-4741-ad64-dd7ee272671a', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '82650e3e-4c5e-4e0a-b166-58760d4daebc', 3, 'Make my bed', '🛏️');
INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES ('2ea6436a-fad3-40e1-a72f-8f7af8bcbee4', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'fb2dfecc-2a90-4891-8055-68c328cbe362', 1, 'Ride my bike', '🚲');
INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES ('6546f49e-7061-4c62-bdde-ac37d3ea8df0', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'fb2dfecc-2a90-4891-8055-68c328cbe362', 2, 'Pack my lunchbox', '🥪');
INSERT INTO weekly_habits (id, family_id, member_id, slot, title, emoji) VALUES ('b214b20d-3971-48bb-b317-fae208388c49', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'fb2dfecc-2a90-4891-8055-68c328cbe362', 3, 'Feed the dog', '🐶');

INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('589a9232-ca7b-4a75-97bb-0aed2303ad45', '7d5829c7-ebc7-4893-9924-86c1c2dbee6e', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-07');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('36bb9034-d0ff-40e1-82c3-07d16e9d0090', '1481facc-fc24-4f29-82a1-7a7540cb3ac6', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-07');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('95911323-be1d-4566-ba5b-5d90adbd1783', '3720c493-d4cd-4741-ad64-dd7ee272671a', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-07');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('80f1f540-c77f-4547-b56a-751fce8cc67f', '7d5829c7-ebc7-4893-9924-86c1c2dbee6e', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-06');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('fab88a65-1479-4e6b-b2ba-dbfe7e7aa12b', '1481facc-fc24-4f29-82a1-7a7540cb3ac6', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-06');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('508bf4e2-68fb-4abc-a975-e02ca8d9f8d4', '3720c493-d4cd-4741-ad64-dd7ee272671a', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-06');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('851c2404-4ea5-4a94-b53c-933b882e5a6f', '7d5829c7-ebc7-4893-9924-86c1c2dbee6e', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-05');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('433553d2-9921-4a86-9770-8343fee44c97', '1481facc-fc24-4f29-82a1-7a7540cb3ac6', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-05');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('08ecca8d-7238-482b-a34b-9729e4cb79e4', '3720c493-d4cd-4741-ad64-dd7ee272671a', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-05');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('fc9f25fb-1cea-48d9-bf51-4ce52e8848c6', '7d5829c7-ebc7-4893-9924-86c1c2dbee6e', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-04');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('64d2d7ef-bee6-4407-b536-a011cfa8f961', '1481facc-fc24-4f29-82a1-7a7540cb3ac6', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-04');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('886fbcf6-eeb2-41ec-9ae1-ff48b70a9364', '3720c493-d4cd-4741-ad64-dd7ee272671a', '82650e3e-4c5e-4e0a-b166-58760d4daebc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-04');
INSERT INTO habit_completions (id, habit_id, member_id, family_id, day) VALUES ('ea38d982-9b3a-4001-9677-58da683609e3', '2ea6436a-fad3-40e1-a72f-8f7af8bcbee4', 'fb2dfecc-2a90-4891-8055-68c328cbe362', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-07');

INSERT INTO habit_streaks (member_id, current_streak, longest_streak, last_won_day) VALUES ('82650e3e-4c5e-4e0a-b166-58760d4daebc', 4, 4, '2026-11-07');
INSERT INTO habit_streaks (member_id, current_streak, longest_streak, last_won_day) VALUES ('fb2dfecc-2a90-4891-8055-68c328cbe362', 0, 2, '2026-11-02');

INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES ('8190f4ea-a597-4b3f-9003-9b1a5c305d25', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '82650e3e-4c5e-4e0a-b166-58760d4daebc', 15, '4-day habit streak bonus', 'demoseed-0-82650e3e-4c5e-4e0a-b166-58760d4daebc');
INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES ('f1018dad-7410-4f09-a3b7-7a063ebe9b05', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '82650e3e-4c5e-4e0a-b166-58760d4daebc', 3, 'Day won', 'demoseed-1-82650e3e-4c5e-4e0a-b166-58760d4daebc');
INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES ('9ebf8c27-298a-41ef-883b-3a56ab1e5929', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'fb2dfecc-2a90-4891-8055-68c328cbe362', 8, 'Habit streak', 'demoseed-2-fb2dfecc-2a90-4891-8055-68c328cbe362');

INSERT INTO rewards (id, family_id, title, star_cost) VALUES ('5f3aea64-fdf8-4b97-b76c-dc6e9c78b2cc', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Movie night, you pick! 🎬', 20);
INSERT INTO rewards (id, family_id, title, star_cost) VALUES ('55de6ff4-0d6b-437e-ae62-cb30e30ec477', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Extra 30 mins screen time', 10);

INSERT INTO movement_ideas (id, family_id, title, category, use_count) VALUES ('cf4ba410-08d3-48ef-84ce-20e7820954f4', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Netball practice', 'movement', 5);
INSERT INTO movement_ideas (id, family_id, title, category, use_count) VALUES ('98cca2f4-e8a3-4ea2-90ff-6dab78d31569', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Family bike ride', 'movement', 3);
INSERT INTO movement_ideas (id, family_id, title, category, use_count) VALUES ('b32ee7f2-0950-4cf0-9e7f-50b3ef799b65', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Backyard cricket', 'movement', 1);
INSERT INTO movement_ideas (id, family_id, title, category, use_count) VALUES ('8adb742b-2545-40a5-a424-a4c9c74c640d', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Feed the dog', 'home', 6);
INSERT INTO movement_ideas (id, family_id, title, category, use_count) VALUES ('2719f6b7-b592-4a6e-87b6-d20d0233d40a', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Make my bed', 'home', 4);
INSERT INTO movement_ideas (id, family_id, title, category, use_count) VALUES ('63d5b546-34cc-44da-b774-d2d9b9b95c5e', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Water the plants', 'home', 1);

INSERT INTO events (id, family_id, member_id, title, pillar, starts_at, recurrence) VALUES ('9d7c274b-225e-4178-a5b2-10cfe5d65b6c', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '82650e3e-4c5e-4e0a-b166-58760d4daebc', 'Netball training', 'move', '2026-11-10T16:00:00.000Z', '{"freq":"weekly","until":"2027-02-05"}');
INSERT INTO events (id, family_id, member_id, title, pillar, starts_at) VALUES ('50eafbd3-d651-4363-96bd-02cddf2b4551', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', NULL, 'Family walk after dinner', 'move', '2026-11-09T17:30:00.000Z');
INSERT INTO events (id, family_id, member_id, title, pillar, starts_at) VALUES ('7ffe6f1d-bfa5-4a8e-b1d7-51cb584c826b', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'fb2dfecc-2a90-4891-8055-68c328cbe362', 'Soccer game', 'move', '2026-11-10T10:00:00.000Z');

INSERT INTO recipes (id, family_id, title, ingredients, steps, category, favorite) VALUES ('13030dde-a41c-40cd-9e65-9b262364d983', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Veggie Pizza Night', '["Pizza base","Tomato paste","Mozzarella cheese","Capsicum","Mushrooms","Cherry tomatoes"]', '["Spread tomato paste on the base","Add cheese and veggies","Bake at 220°C for 12 minutes"]', 'dinner', 1);
INSERT INTO recipes (id, family_id, title, ingredients, steps, category, favorite) VALUES ('29548c2b-9461-4633-b1de-0aeea2414ed1', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Yoghurt, Berries & Overnight Oats', '["Rolled oats","Milk","Greek yoghurt","Mixed berries","Honey"]', '["Mix oats and milk in a jar, refrigerate overnight","In the morning top with yoghurt, berries and honey"]', 'breakfast', 1);
INSERT INTO recipes (id, family_id, title, ingredients, steps, category, favorite) VALUES ('cffab21b-3eee-4909-a2a1-e5130e7dd18e', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Chicken Schnitzel & Mash', '["Chicken breast","Breadcrumbs","Egg","Potatoes","Butter","Milk"]', '["Crumb the chicken and pan-fry until golden","Boil and mash the potatoes with butter and milk"]', 'dinner', 0);
INSERT INTO recipes (id, family_id, title, ingredients, steps, category, favorite) VALUES ('e4114d2e-e1a8-4751-8481-a2c611536d99', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Veggie Nachos', '["Corn chips","Grated cheese","Black beans","Salsa","Avocado"]', '["Layer chips, beans and cheese on a tray","Bake until cheese melts, top with salsa and avocado"]', 'snacks', 0);

INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, meal_type, together) VALUES ('fb2c8654-e33e-4bb2-ae66-0077b01ebfa5', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-02', '29548c2b-9461-4633-b1de-0aeea2414ed1', 'Yoghurt, Berries & Overnight Oats', 'breakfast', 0);
INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, meal_type, together) VALUES ('b2b4d903-6090-4d44-a42a-0e1578ba88fa', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-03', 'e4114d2e-e1a8-4751-8481-a2c611536d99', 'Veggie Nachos', 'snacks', 0);
INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, meal_type, together) VALUES ('b85746b3-f628-4fdf-b131-45cc46124c5f', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-06', '13030dde-a41c-40cd-9e65-9b262364d983', 'Veggie Pizza Night', 'dinner', 1);
INSERT INTO meal_plan_items (id, family_id, day, recipe_id, title, meal_type, together) VALUES ('1d71f3e9-5396-4608-9dc3-c7ceecd15b81', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', '2026-11-04', 'cffab21b-3eee-4909-a2a1-e5130e7dd18e', 'Chicken Schnitzel & Mash', 'dinner', 0);

INSERT INTO shopping_items (id, family_id, name) VALUES ('cb5a3165-fef4-4465-9295-4aa4b0afec92', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Mozzarella cheese');
INSERT INTO shopping_items (id, family_id, name) VALUES ('e26e398c-23b4-49c2-865e-0a5f49887880', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Mixed berries');
INSERT INTO shopping_items (id, family_id, name) VALUES ('28fcff33-8915-4d46-8272-c821238abe57', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Black beans');
INSERT INTO shopping_items (id, family_id, name) VALUES ('ca0ef290-fcb2-4bf0-a5a6-40b8eeda324d', '93a39fbd-e445-4fc8-a24d-e2384c7ae9f3', 'Chicken breast');

-- Done! Login with join code DEMO01 and PIN 0000.

-- ============================================================
-- TO REMOVE THE DEMO FAMILY LATER (run this instead, not the above):
-- DELETE FROM families WHERE join_code = 'DEMO01';
-- (family_id cascades to delete members/events/habits/etc. automatically)
-- ============================================================
