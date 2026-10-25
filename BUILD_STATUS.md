# Build Status

Honest, up-to-date status of every feature. Nothing in this file is marked "done" unless it has actually been tested end-to-end. Per our engineering ethics rule: **never fake an integration and call it production-ready.**

Status key: ✅ Working & tested · 🚧 In progress · ⛔ Not started · ⚠️ Demo/mock only (not real) · 🔒 Blocked (needs external setup)

---

## Infrastructure
| Item | Status | Notes |
|---|---|---|
| GitHub repo created & connected | ✅ | `inhouseav/habitquest`, empty repo cloned 2026-10-24 |
| Cloudflare Worker project | ✅ | Live at https://habitquest.ihav.workers.dev — deployed, public URL enabled, confirmed working 2026-10-24 |
| Static site + API scaffold | ✅ | `src/worker.js` serves `public/` and handles `/api/health` — tested live, returned `{"ok": true, ...}` on 2026-10-24 |
| D1 database | ✅ | Real database `habitquest-db` (id `2fa8326b-db8d-4a92-99c0-83a24b7d2a86`) created, bound, and schema applied via the Cloudflare D1 console on 2026-10-24. All 5 tables confirmed present (`families`, `members`, `events`, `star_ledger`, `recipes`). Live `/api/health` check confirmed `db_binding_present: true` and `db_reachable: true`. |
| R2 bucket (photos) | ⛔ | Not started; binding commented out for the same reason as D1 |

## Core features (Sessions 1–5 scope)
| Item | Status | Notes |
|---|---|---|
| Family PIN/passcode login | ✅ | Join code + PIN (PBKDF2-hashed), D1-backed sessions. **Tested live 2026-10-24** — Maddie created a real family ("The Walkers"), logged in, and it persisted. |
| Shared family calendar (server-backed) | ✅ | `/api/events`, rendered as a real month grid (like a standard calendar app) with color-coded event chips, month navigation, and today highlighted — not just a flat list. **Tested live** — Maddie added a real event ("Walking Benji", tagged "move") and it showed up correctly; grid view added 2026-10-24 after Maddie asked for a proper calendar look. |
| Family members (add/list) | ✅ | **Tested live** — Maddie added 2 extra members ("jim", "jam") with auto-assigned colors. |
| Star ledger (give-a-star button) | ✅ | **Tested live** — stars visible per member in the UI. |
| Personal Weekly Habits (replaces Fuel/Move/Grow) | 🚧 | Each family member now picks their OWN 3 habits (any title + emoji, e.g. "Walk Benji for 20 mins") instead of fixed Fuel/Move/Grow categories — closer to the connected-system vision (Phase 1 of the rework). Tick-circle rows, "X of 3 practised today" wording instead of "Won the day!", and an inline "Choose/Edit habits" form per member. Awards 1 star per tick, duplicate-proof, same as before. Old Fuel/Move/Grow code and `daily_pillars` table are left untouched (not deleted) so no history is lost. Code written, syntax-checked, **not yet tested live** — needs the 006 migration run first. |
| Recipes module | 🚧 | `/api/recipes` (list/create) built, ingredients/steps as simple line lists, wired into the UI. Now has category tabs (All/Breakfast/Lunch/Dinner/Snacks/Lunchboxes) above the list, and a category field on the add-recipe form. Not yet tested live. |
| AI recipe intake (photo scan + "AI fill" from a name) | 🔒 | Built 2026-10-25: `/api/ai/recipe-from-photo` (📷 Scan a recipe photo — upload a photo of a cookbook page/recipe card/packet, AI drafts the title/ingredients/steps/category for you to review before saving) and `/api/ai/recipe-from-name` (✨ AI fill — type a dish name, AI drafts the rest). Both gated behind `ANTHROPIC_API_KEY`, same as the AI assistant — shows a friendly "not set up yet" message until that's added. Never auto-saves; always fills the form for the family to check and edit first. |

## Extended features (Sessions 6–14 scope)
| Item | Status | Notes |
|---|---|---|
| Meal planning / voting | 🚧 | `/api/meal-plan` built: propose a meal for a day, anyone can vote (toggle). Recipes now connect in — each recipe card has a "🍳 Cook this" button that adds it straight to the meal plan for a chosen day. Added 2026-10-25: a "We're all eating this together" checkbox when suggesting a meal (and a toggle on existing meals), plus a gentle "X family meals together this week!" counter — directly from the dietitian research finding that eating together regularly matters more than any single food choice. No guilt/shame framing — just a count. Not yet tested live. |
| Shopping lists | 🚧 | `/api/shopping` built: add, check off, delete, shared across the family. Any meal plan item linked to a recipe now has a "🛒 Add ingredients" button that pushes that recipe's ingredients onto the list (skips ones already there). A "📋 Copy list for Woolworths/Coles" button copies the unchecked items as plain text to paste into either app — **honest limit:** neither supermarket has a public way to add items automatically from another app, so this is copy/paste, not a real one-tap export. Not yet tested live. |
| Weekly family meetings | 🚧 | `/api/meetings` built: one notes doc per family per week (Monday-starting). Not yet tested live. |
| Reward shop | 🚧 | `/api/rewards` built: parents add rewards with a star cost, any member can redeem (spends stars via the same ledger, can't go negative). Not yet tested live. |
| Family Cookbook (photos + favourites) | 🔒🚧 | Built 2026-10-25: `/api/photos` (upload/fetch/delete, real family photos, free — stored in R2), `/api/recipes/:id/favorite` (star a recipe), `/api/cookbook` (compiles favourited recipes + photos for a date range, with a Print button). Each recipe card gets 📷 Add photo, ☆ Favourite, and ✨ AI photo buttons. **Blocked:** needs the `PHOTOS` R2 bucket created (same one-time Cloudflare dashboard step as the D1 database) before the binding in `wrangler.toml` can be uncommented and any of this goes live. Not yet tested live. |
| AI-generated recipe photos | 🔒 | `/api/ai/image` built 2026-10-25 — generates one food-photo-style image per recipe via OpenAI's image API (~1-3c/image at the cheapest tier, current as of research; check before relying on it). **On hold** — Maddie said she'll add the key later; needs a parent for the paid account/billing, same as the AI assistant. Shows a friendly "not set up yet" message until `OPENAI_API_KEY` is added. Real photo uploads work today for free regardless. |
| Family Memories (slideshow) | 🔒🚧 | Built 2026-10-25: `/api/memories` counts the family's total photos; below 5, shows a rainbow progress bar ("3 of 5 photos"); at 5+, unlocks a rainbow-themed slideshow of the 12 most recent photos, mixing recipe photos AND habit/activity photos (📷 button now appears on any ticked-off habit, not just recipes), tagged "🍳 Recipe" or "⚡/🌱 Habit". **Blocked** on the same R2 bucket as the Family Cookbook. Not yet tested live. Deferred (Maddie's call): the idle/sleep-mode screensaver for a future iPad-on-the-bench setup — that's its own step once a real iPad is mounted. |
| External calendar sync (Google Calendar) | ✅ | **Tested live 2026-10-24.** One-way sync: new events added in Fuel the Fun also get created on the family's connected Google Calendar. Maddie registered the OAuth app herself, connected her account, added a real test event in the app, and confirmed it appeared on calendar.google.com. (Full two-way sync — pulling existing Google events in — was not built; honest about that scope limit.) |
| Push notifications | ✅ | **Tested live 2026-10-24.** Hand-rolled Web Push (VAPID + RFC 8291 encryption via Web Crypto API — no npm package, no third-party account needed). New calendar events now also notify the rest of the family automatically. Maddie confirmed a real notification banner on her Mac (after discovering macOS Focus mode was silently blocking it). |
| AI planning assistant | 🔒 | Code built and deployed 2026-10-24 — a "Need an idea?" card calls Claude to suggest a personalized fuel/move/grow activity, using each member's stored interests. **On hold per Maddie's decision (2026-10-24)** — she decided not to set up the paid API account for now and to focus on polishing instead. The card is live but will show a friendly "not set up yet" message until `ANTHROPIC_API_KEY` is added. Updated 2026-10-25: the mood picker is now a free, instant, no-AI-needed idea picker for all 4 moods (hungry/bored/energetic/tired), each with a curated suggestion list — no need to wait for the paid key just to get an idea. The "Hungry" list is now grouped into 4 categories (Protein + Fruit, Protein + Veggies, High-Fibre, Crunchy) matching how one dietitian response grouped good snack combinations. |

## V1 (frozen, untouched)
| Item | Status | Notes |
|---|---|---|
| V1 snapshot | ✅ | Frozen 2026-10-24. See claude.ai Tobias project doc `claude/version-snapshots.md` for revert instructions. |

---
*Last updated: 2026-10-25 — Added the family-meals-together tracker (checkbox + weekly counter) and grouped the Hungry snack picker by dietitian-matched categories, both directly from `DIETITIAN_RESEARCH.md` findings. Needs migration `008_family_meal_together.sql` run next, then a real end-to-end test through the UI. Sessions 1-2 fully proven live. Sessions 3-8 (reward shop, recipes, meal planning, shopping list, family meetings) all coded, syntax-checked, and pushed, but not yet tested live. Personal Weekly Habits (replacing Fuel/Move/Grow) needs the `006_personal_weekly_habits.sql` migration run, then a real end-to-end test, before it gets marked ✅. More rework phases (calendar-habit links, Weekly Family Check-in) are planned next.*
