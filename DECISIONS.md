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
