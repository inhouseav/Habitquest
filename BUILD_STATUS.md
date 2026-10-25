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
| Recipes module | 🚧 | `/api/recipes` (list/create) built, ingredients/steps as simple line lists, wired into the UI. Not yet tested live. |

## Extended features (Sessions 6–14 scope)
| Item | Status | Notes |
|---|---|---|
| Meal planning / voting | 🚧 | `/api/meal-plan` built: propose a meal for a day, anyone can vote (toggle). Recipes now connect in — each recipe card has a "🍳 Cook this" button that adds it straight to the meal plan for a chosen day. Not yet tested live. |
| Shopping lists | 🚧 | `/api/shopping` built: add, check off, delete, shared across the family. Any meal plan item linked to a recipe now has a "🛒 Add ingredients" button that pushes that recipe's ingredients onto the list (skips ones already there). A "📋 Copy list for Woolworths/Coles" button copies the unchecked items as plain text to paste into either app — **honest limit:** neither supermarket has a public way to add items automatically from another app, so this is copy/paste, not a real one-tap export. Not yet tested live. |
| Weekly family meetings | 🚧 | `/api/meetings` built: one notes doc per family per week (Monday-starting). Not yet tested live. |
| Reward shop | 🚧 | `/api/rewards` built: parents add rewards with a star cost, any member can redeem (spends stars via the same ledger, can't go negative). Not yet tested live. |
| Photo memory books | ⛔ | Not started — needs an R2 bucket, which Maddie hasn't created yet (same process as the D1 database) |
| External calendar sync (Google Calendar) | ✅ | **Tested live 2026-10-24.** One-way sync: new events added in Fuel the Fun also get created on the family's connected Google Calendar. Maddie registered the OAuth app herself, connected her account, added a real test event in the app, and confirmed it appeared on calendar.google.com. (Full two-way sync — pulling existing Google events in — was not built; honest about that scope limit.) |
| Push notifications | ✅ | **Tested live 2026-10-24.** Hand-rolled Web Push (VAPID + RFC 8291 encryption via Web Crypto API — no npm package, no third-party account needed). New calendar events now also notify the rest of the family automatically. Maddie confirmed a real notification banner on her Mac (after discovering macOS Focus mode was silently blocking it). |
| AI planning assistant | 🔒 | Code built and deployed 2026-10-24 — a "Need an idea?" card calls Claude to suggest a personalized fuel/move/grow activity, using each member's stored interests. **On hold per Maddie's decision (2026-10-24)** — she decided not to set up the paid API account for now and to focus on polishing instead. The card is live but will show a friendly "not set up yet" message until `ANTHROPIC_API_KEY` is added. |

## V1 (frozen, untouched)
| Item | Status | Notes |
|---|---|---|
| V1 snapshot | ✅ | Frozen 2026-10-24. See claude.ai Tobias project doc `claude/version-snapshots.md` for revert instructions. |

---
*Last updated: 2026-10-24 — Sessions 1-2 fully proven live. Sessions 3-8 (reward shop, recipes, meal planning, shopping list, family meetings) all coded, syntax-checked, and pushed, but not yet tested live — needs the `003_daily_pillars_rewards_meals_shopping_meetings.sql` migration run next. Personal Weekly Habits (replacing Fuel/Move/Grow) is the first phase of the "connected family system" rework — needs the `006_personal_weekly_habits.sql` migration run next, then a real end-to-end test through the UI before any of it gets marked ✅. More rework phases (calendar-habit links, recipes↔meals↔shopping, Weekly Family Check-in) are planned next.*
