# Fuel the Fun — Project Brief

## What this is
Fuel the Fun is a healthy-habits app for children aged 7–12, built as Maddie's Steiner Tobias Project. It helps kids choose fun activities that build healthy habits — eating well, trying new foods, moving daily, spending time outside, learning where food comes from, and building healthy family routines — without it ever feeling like a chore, a diet, or a competition.

## Where it came from
- V1 was built as a single-file, client-only Claude Artifact (HabitQuest): calendar-first planning, dynamic family members, "Pick 3 Habits for the Week," and an IDEA → ACTION system for turning vague challenges into concrete steps.
- V2 ("GrowCrew" working name) extends this into a real, multi-device, multi-user family app, following a 14-session build guide prepared 20 October 2026 for Maddie's Tobias deadline.
- **Scope decision (2026-10-24):** Maddie chose to try for everything in the 14-session guide, not a reduced subset — see DECISIONS.md.

## The Seven Modules (from the Project Bible)
1. Fuel Your Body
2. Food Explorers
3. Healthy Snacks
4. Grow It
5. Move Your Way
6. Screen Balance
7. Healthy Home

## Who it's for
- Children 7–12.
- Parents, who can join in and complete challenges alongside their kids.

## What makes it different
- Not about calories or weight loss — about feeling healthy, strong, happy, and confident.
- Encourages putting the device down to do the activity in real life.
- Built from real dietician survey responses collected before development started.

## Hard rules (never violated)
The app must NEVER:
- Make children feel bad about food.
- Focus on body weight.
- Encourage dieting.
- Compare children with each other.
- Replace advice from doctors or health professionals.

The app must ALWAYS:
- Celebrate effort, not outcomes.
- Encourage curiosity.
- Help children learn.
- Include families whenever possible.
- Make healthy habits fun.

## Engineering ethics (non-negotiable)
**Never fake an integration and call it production-ready.** If a feature (calendar sync, push notifications, AI planning, photo storage, accounts) isn't actually wired up and working, it is marked clearly as "not yet built" or "demo only" in BUILD_STATUS.md — never presented as done. This applies to every session of this build.

## Chosen architecture
Cloudflare Pages (frontend) + Pages Functions/Workers (server-side logic, hidden API keys, permission checks) + D1 (SQLite database: family/members/events/stars/recipes) + R2 (private family photo storage). Family login uses a simple PIN/passcode system rather than full OAuth, appropriate for children. See DECISIONS.md for why.

## Design system
"Calm & Clear" — chosen 2026-10-24. Warm ivory/cream background (#FAF6ED), off-white cards (#FFFDF8), deep forest-green text (#183F35), sage (#E4EAD9), terracotta (#BE7050) accent/CTA, peach (#F8E3D1), soft blue (#E2ECEE), pale gold (#F8E8C7). Warm serif headings + readable sans-serif body. Restrained rounded cards, botanical illustrations (no mascot character). Bottom nav: Today / Calendar / Food / Family.

## Repo
https://github.com/inhouseav/habitquest
