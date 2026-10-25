# Decisions Log

Each entry: date, decision, why, alternatives considered.

---

## 2026-10-24 — Freeze V1 before starting V2
**Decision:** Took a permanent, frozen backup of the V1 Claude Artifact (single-file HabitQuest) before any V2 work began.
**Why:** V2 is a much bigger architectural change (real backend, multi-device). Maddie needs a guaranteed revert point if V2 breaks things, without losing the V1 app.
**Record:** See the claude.ai "Tobias" project doc `claude/version-snapshots.md` for both artifact URLs and revert instructions.

---

## 2026-10-24 — Scope: try for everything in the 14-session guide
**Decision:** Build toward the full 14-session guide (multi-user accounts, shared family calendar, Fuel/Move/Grow star ledger, recipes, meal planning/voting, shopping lists, weekly family meetings, reward shop, photo memory books, external calendar sync, push notifications, AI planning assistant) rather than a reduced scope.
**Why:** Maddie's explicit choice after being shown a reduced-scope alternative (Sessions 1–5 only).
**Alternatives considered:** Build only Sessions 1–5 (core account + calendar + star ledger) as a safer bet for the Tobias deadline. Rejected by Maddie.
**Risk accepted:** Some later-session features (AI assistant, push notifications, external calendar sync) require third-party setup (API keys, provider registration) that may not get fully wired up in time. Per the engineering ethics rule, any such feature will be clearly marked "not yet built" rather than faked.

---

## 2026-10-24 — Backend architecture: Cloudflare Pages + Workers + D1 + R2
**Decision:** Use Cloudflare's stack for all V2 backend needs.
**Why:** Low/no cost, beginner-appropriate, and Maddie already has a Cloudflare account and GitHub set up (for another project) that can be reused for this new, isolated repo/project.
**Alternatives considered:** Firebase, Supabase — both viable but would mean learning a second platform/account instead of reusing what's already set up.
**Caveat:** Cloudflare has no built-in user-auth service — family login will use a simple PIN/passcode system instead of OAuth or email accounts, which is also more appropriate for children. Calendar sync (Google Calendar), push notifications (Web Push/VAPID), and the AI planning assistant each need their own separate provider setup regardless of hosting choice — these are tracked individually in BUILD_STATUS.md.

---

## 2026-10-24 — Reuse existing GitHub/Cloudflare accounts, new isolated repo
**Decision:** Use Maddie's existing GitHub and Cloudflare accounts (already set up for another project), but in a brand-new, separate repo (`inhouseav/habitquest`) and a separate Cloudflare Pages project — not mixed into the existing project.
**Why:** Avoids re-doing account setup while keeping Fuel the Fun fully isolated from the other project.

---

## 2026-10-24 — Design system: "Calm & Clear"
**Decision:** Adopted the "Calm & Clear" visual design (warm ivory/cream, forest green text, terracotta accent, botanical illustrations, no mascot).
**Why:** Maddie's selection after reviewing design options on 20 October 2026.

---

## 2026-10-24 — Skip Google Calendar sync, push notifications, and the AI assistant for now
**Decision:** Build everything else in the 14-session guide first; leave these 3 features out unless there's time left before the Tobias deadline.
**Why:** Each genuinely requires Maddie (not Claude) to do real outside setup — registering a Google Cloud OAuth app and clicking through Google's own consent screens, and/or creating an account with a paid AI provider. These can't be done on her behalf. Rather than block all other progress on that setup, we're building the rest of the app (Daily Three dashboard, reward shop, recipes, meal planning/voting, shopping list, weekly family meetings, photo books) first.
**Record:** Tracked individually in BUILD_STATUS.md as 🔒 (blocked, skipped by choice) rather than ⛔, so it's clear this was a deliberate decision, not an oversight.

---

## 2026-10-24 — Hold off on the AI planning assistant, shift to polishing
**Decision:** Google Calendar sync and push notifications got un-skipped and shipped (both tested live). The AI assistant's code was also built and deployed, but Maddie decided not to set up the paid Anthropic API account right now, and to move on to polishing the app instead.
**Why:** The AI assistant is the one remaining feature that costs real money to actually use (a per-request API fee), which needs a parent for the payment step. Maddie would rather spend her remaining time on polish than chase that down right now.
**Record:** The "Need an idea? 🤖" card and `/api/ai/suggest` route are already live in the code — turning the feature on later is just adding one Cloudflare secret, no further building needed.

---

## 2026-10-24 — Begin the "connected family system" rework, starting with personal habits
**Decision:** Maddie asked for a bigger rework connecting habits, calendar, meals/recipes/shopping and a new guided Weekly Family Check-in, instead of a loose set of separate features. Starting with Phase 1: replace the fixed Fuel/Move/Grow categories with each family member's own 3 chosen weekly habits.
**Why:** Fuel/Move/Grow forced every family member into the same 3 generic buckets. Personal habits (any title + emoji a member picks) is the foundation the rest of the rework (calendar links, the weekly check-in wizard, progress language) depends on, so it goes first.
**What changed:** New `weekly_habits` and `habit_completions` tables (migration 006). New `/api/habits` routes. Dashboard card renamed "This Week's Habits," tick-circle rows instead of fixed pillar buttons, "X of 3 practised today" instead of "Won the day!", inline "Choose/Edit habits" form per member. The old Fuel/Move/Grow code and `daily_pillars` table are left in place untouched — not deleted — so no history is lost and V1/early V2 data stays intact.
**Next phases (not yet started):** move the join code into its own "invite family member" area; a "Today in the family" summary header; a less competitive kudos system replacing star-giving; calendar day cells showing habit/event indicators together; linking calendar events to habits (support vs. complete); the guided Weekly Family Check-in that sets the week's habits/meals/events in one flow.

---

## 2026-10-25 — Connect recipes → meal plan → shopping list; Family Cookbook photos
**Decision:** Recipes now connect to the rest of the app: a "🍳 Cook this" button on a recipe adds it to the meal plan for a chosen day; any meal plan item linked to a recipe gets a "🛒 Add ingredients" button that pushes that recipe's ingredients onto the shared shopping list; the shopping list gets a "📋 Copy list for Woolworths/Coles" button. Separately, built a Family Cookbook: favourite a recipe (⭐), attach a real photo when you cook it (📷, free, stored in Cloudflare R2), optionally generate an AI food photo instead (✨, costs ~1-3c/image via a separate paid key — Maddie said she'll add that key later), and a Family Cookbook view compiles favourites + photos for any date range with a Print button.
**Why — Woolworths/Coles:** neither supermarket offers a public API for adding items to a cart from an outside app, so the "export" is an honest copy/paste of plain text, not a fake one-tap integration.
**Why — AI photos:** Claude doesn't generate images, so this needs a separate provider (OpenAI). Researched current pricing (~$0.01-$0.17/image depending on quality/provider) and recommended real uploaded photos as the default (free, more meaningful for a family memory book) with AI photos as an optional add-on, gated behind a key the same way the AI assistant is.
**Research basis:** Maddie provided the original dietitian survey spreadsheet (16 responses) — see `DIETITIAN_RESEARCH.md`. The unanimous finding (never frame anything around weight loss for kids) and the most-repeated theme (involve kids in shopping/cooking/choosing) directly shaped the recipe set (added build-your-own formats: pizza night, rice bowl bar) and the "How'd it go?" rating in the cook view (😍/🙂/😐 instead of pass/fail, so trying something new never feels like a test).
**Blocked:** the Family Cookbook needs an R2 bucket created in the Cloudflare dashboard (same one-time step as the D1 database) before photos will actually work — binding is ready in `wrangler.toml`, just commented out.

---

## 2026-10-25 — Two app changes directly from the dietitian research
**Decision:** After distilling the full 16-response dietitian spreadsheet into `DIETITIAN_RESEARCH.md`, made two concrete app changes it pointed to:
1. **Grouped the "Hungry" snack picker into 4 categories** (Protein + Fruit, Protein + Veggies, High-Fibre, Crunchy) instead of one flat list of 18 — matches how one dietitian response itself grouped good snack combinations, and makes the dropdown easier for a kid to scan (shown as `<optgroup>`s).
2. **Added a "family meal together" tracker** — a checkbox when suggesting a meal ("We're all eating this together 👨‍👩‍👧"), a toggle on existing meal-plan rows, and a weekly counter ("X family meals together this week!"). Several dietitian responses named eating together regularly as one of the highest-impact habits — more so than any single food choice.
**Why no guilt framing:** per the app's own rule (never make kids feel bad, never compare), the counter only ever counts up and celebrates — there's no target, no red/incomplete state, and missing a together-meal is never flagged.
**Record:** migration `008_family_meal_together.sql` adds the `together` column to `meal_plan_items`.

---

## 2026-10-25 — Family Memories slideshow: sample first, then built for real
**Decision:** Sketched a "rainbow Google-Photos-Memories"-style slideshow idea as a sample page first (not touching the live app), got feedback (mix in activity photos, not just recipes), then built the real feature once the direction was confirmed. `/api/memories` unlocks a slideshow once the family has 5+ photos total; below that, shows a gentle progress bar. Photos can now be tagged to a habit (habit_id on `cookbook_photos`, migration `009_memories.sql`), so a 📷 button appears on any ticked-off habit, not just recipe cards — the slideshow mixes cooking and activity moments.
**Why 5 photos:** an arbitrary, easy-to-change starting threshold — not from the dietitian research, just a reasonable "enough to be worth a slideshow" number. Easy to tune later via `MEMORIES_THRESHOLD` in `photos.js`.
**Deferred:** the idle/sleep-mode screensaver (so this becomes the default view on a future iPad mounted on the kitchen bench) — Maddie's call to build that separately once there's a real iPad to test against, rather than guessing at kiosk/idle-detection behaviour now.
**Blocked:** same R2 bucket as the Family Cookbook.
