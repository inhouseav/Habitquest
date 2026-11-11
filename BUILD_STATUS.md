# Build Status

Honest, up-to-date status of every feature. Nothing in this file is marked "done" unless it has actually been tested end-to-end. Per our engineering ethics rule: **never fake an integration and call it production-ready.**

Status key: ✅ Working & tested · 🚧 In progress · ⛔ Not started · ⚠️ Demo/mock only (not real) · 🔒 Blocked (needs external setup)

## ✅ Countdowns, Family screen, Jobs & plans quick add (2026-11-11)

- **⏳ Countdowns:** "🏕️ 3 sleeps until Camp" chips on Today (next 5, up to 120 days ahead). Add with "＋ Countdown" (Camp, Birthday, Holiday, Beach day, Christmas, Party, Big game, School holidays, or type one + a date), or tick "⏳ Show a countdown on Today" in the calendar quick add. Stored as events with `countdown = 1` (column added automatically; record in db/migrations/024).
- **🖼️ Family screen:** when an iPad/laptop is left alone for 2 minutes (on by default for tablets & laptops, off on phones; toggle in Family → Settings, or open it with "🖼️ Family screen"): big clock + date, countdowns, today's plan (events + planned habits with times and who), and a slideshow from Family Memories (or recipe pictures until there are enough memories). Tap anywhere to go back. Never pops up over an open popup or while typing.
- **📝 Jobs & plans** in the calendar quick add: Drop off, Pick up, Shopping, Sleepover, Party, Appointment, Sport, Homework due, Visit, Chores — tap one, add the details ("🚗 Drop off · netball"); sensible default times.

## ✅ Picture tiles everywhere + iPad wall-calendar layout (2026-11-11)

From Maddie's iPad testing notes + a review of the Calmo Daily family calendar:
- **Choose habits:** Move / Cook / Home are big picture tiles (family ideas and recipes with photos first, then ideas from the 7 modules); tap one, or "✏️ My own idea". Bonus habits fold away. Big "✅ Save my habits" button.
- **Win the Day progress card:** ⭐ stars this week · 🔥 day streak · 🎁 how many more to your reward, a big progress bar, "3 more ⭐ to Pick the movie!", and rewards as tappable picture cards (no dropdown).
- **Calendar quick add:** tap a day → popup with the family's saved activities, habits and past events as tiles → who (chips) → when (Morning / After school / Dinner time / Evening or a time) → "Add to Thursday ✓". For a Move/Home activity for one person it can also make it their habit that day. "More options" opens the full form (repeat weekly).
- **Meals quick add:** ＋ on a day → recipe picture cards (favourites ⭐ and the right meal type first) → one tap adds it (+ ingredients to the shopping list). Or type something else.
- **Reward shop:** rewards are colourful picture cards; "💡 Reward ideas kids love" — fun experiences, never food (dietitian survey) — tap to add (kids' ideas wait for a parent).
- **Sideways iPad / laptop (like a wall calendar):** side menu with a big clock + date; 1-week calendar is big day boxes 4 + 3 with the time and who under each event.

## ✅ Tap a calendar day to add an event (2026-11-10)

- Each day in the calendar is tappable (small ＋ in the corner): it opens the Add Event form with that day's date filled in (4pm, or the next hour if it's later today), the day highlighted and a ✕ to close. Tapping an existing event still opens that event. The old "+ Add an event" button is gone; a hint says "👆 Tap a day to add something to it". Works in week, 2-week and month views on phone, iPad and laptop.

## ✅ Stars are personal — no side-by-side comparisons (2026-11-10)

- Family members list no longer shows star counts (Give Kudos stays for parents).
- Rewards → weekly progress: kids see only **My week**; parents see everyone (to know which rewards to give); nobody picked → a "👤 Who are you?" prompt.
- Food passport name buttons no longer show each person's count.

## ✅ Family members: one Add popup + Joined / Invited / Family device (2026-11-10)

- **+ Add family member** opens the same popup as Invite someone: name, Kid/Parent, then **✉️ Send them an invite** (email → Gmail) or **📱 Just add them — they'll use a family device** (younger kids). Same name twice is refused.
- **Status on each person:** ✅ Joined · 📱 Family device · ✉️ Invited — not joined yet (Resend) · ⏳ Not joined yet (✉️ Invite). Stars and kudos only show for people who've joined or use a family device.
- **Joined** is recorded when someone picks themselves on a phone, opens the app as themselves, or uses their invite link; the family creator is joined at signup; demo families are all joined.
- **Upgrade:** new `members` columns `invited_at`, `joined_at`, `device_only` are added automatically (`ensureMemberStatus`). Existing people count as joined if they started the family or have earned stars; others show "Not joined yet" until they open the app. Route: `POST /api/members/:id/status`.

## ✅ Invite someone (opens Gmail) + first-time setup quiz (2026-11-10)

- **✉️ Invite someone** (Family → Settings → Invite family): name + Kid/Parent + email → adds them to the family if new → **Open Gmail and send** (Gmail compose in the browser, so it works without a mail app), plus "Other email app" and "Copy invite". The email has a personal link `/welcome?code=…&who=<member>&name=…`. Emails are only used to open Gmail, never stored. Family PIN is never in the email.
- **Personal link:** welcome page says "Hi Mia! 👋 You're invited"; Let's go → code filled; after the family PIN the app knows who they are (no who-picker) and opens the **setup quiz**: hello/how it works → what do you love (13 interests, saved on the member) → 3 habits suggested from their interests (or type your own) → weekly reward (or suggest one for a parent to OK) → ready. Parents get 4 steps (no reward step, a parent-PIN tip).
- **First-time habits:** someone with no habits yet may save their own (`firstSetup: true`) even with a parent PIN; after that only a parent can change them (tested).
- New route: `POST /api/members/:id/interests`.

## ✅ Food Explorer Passport + the 7 modules in habit ideas (2026-11-10)

- **🥕 Food Explorer Passport** (top of 🍳 Food; nudge button under Win the Day): 24 kid-friendly foods + "another food". Tap → "How was it?" 😋 Loved it / 🙂 It's OK / 🤔 Not yet — every try stamps (effort counts). Badges at 1/5/10/20 foods.
- **Bonus ⭐ for trying a new food** — can't be farmed: each food stamps once per person; 1 food star a day; max 3 a week; today only. Counts toward the weekly goal. Parents can remove a stamp. (`src/routes/foodPassport.js`, table auto-created; record in db/migrations/023.)
- **Habit ideas from all 7 modules** in the habit editor: Move Your Way, Screen Balance, Food Explorers, Healthy Snacks, Fuel Your Body, Grow It, Healthy Home (and for bonus habits).
- Demo family has passport stamps; welcome page + parent rules list mention the food bonus.

## ✅ Faster + simpler: sections with a bottom tab bar (2026-11-10)

- **Sections:** the app is now 5 sections with a bottom tab bar: 🌟 Today (Win the Day — always first), 📅 Plan (calendar, Planner, Need an idea), 🍳 Food (meals, shopping, recipes, cookbook), 🎁 Rewards, 👨‍👩‍👧 Family (members, memories, check-in, then Settings: invite, notifications, Google, Parents, log out). One section on screen at a time. Who-are-you chip in the header.
- **Phone / iPad / laptop:** single column on phones; on iPad and laptop the cards inside a section sit side by side. Checked on iPhone, iPad portrait + landscape, laptop.
- **Simpler text:** Today header is one line (date · do all 3 to win); shorter demo welcome; meal days use a small ＋.
- **Speed:** server code runs next to the database (`[placement] mode = "smart"` in wrangler.toml); habits and weekly lookups run in parallel; Today loads first and the other sections fill in behind it; ticking a habit shows ✓ instantly; identical lookups within 2s share one request; the calendar only redraws when Plan is open; the screenshot tool (html2canvas) loads only when the 💡 is used.

## ✅ Launch: welcome page, invite links, family recipe pack, demo pictures (2026-11-10)

- **Welcome page** `/welcome` (public/welcome.html): "Ready to Win the Day?", a tap-to-try 3-habit demo, how it works (4 steps), how stars work (1/2/1, 12 ⭐ unlocks Saturday), features, and join steps. `/welcome?code=ABC123` shows the family code and its "Let's go!" opens the app with the code already filled in (`/?code=`). Login screen links to it ("New here? See how it works").
- **Invite by email** text now links to `/welcome?code=<family code>` with step-by-step instructions (PIN not included).
- **🇦🇺 Add family favourites pack** (Recipes): the Walkers' 6 favourites starred + 16 popular Aussie family recipes/lunchboxes/snacks (`src/lib/recipePack.js`); skips existing titles (starring them if a favourite); AI pictures made in the background.
- **Demo family recipe pictures:** made once with Workers AI into shared `demo/…` keys in R2 and reused by every demo family (`src/lib/demoPictures.js`); removing a demo photo never deletes the shared file. First demo after deploy makes them (in the background).

## ✅ Parent PIN + parent admin area (2026-11-10)

- A **parent PIN**, separate from the family PIN (refuses to be the same). Set it in **🔒 Parents ›** (top row) / **🔒 Parent admin** (Reward shop). Unlocking stores the parent on *this phone's session* (`sessions.parent_member_id`), so parent powers are checked on the server, not just by the name picked.
- Picking a parent's name in 👤 Who's using this phone asks for the parent PIN; picking a child / shared locks parent mode. 5 wrong parent PINs → 10-minute pause. "Lock parent mode" button for handing a phone to a kid.
- Once a parent PIN exists, only an unlocked parent can: set anyone's habits (Parent admin → ✏️ each person), swap in a day's habit from the Planner, remove Planner ideas, approve/edit/remove rewards, give kudos, set the weekly goal, mark rewards given. Kids can still tick habits, plan their week, choose their weekly reward and suggest rewards (pending). Before a PIN is set, everything works as before.
- Columns auto-added (record: migration 022). Tested: parent laptop + child phone, wrong PIN, child sending a parent's id directly to 4 parent-only routes (all refused), lock/unlock.

## ✅ Rewards v2: weekly goal, unlocks Saturday, hard to cheat (2026-11-10)

Replaces the earlier "buy rewards with stars" shop (too many stars, easy to game).
- **Stars:** 1 per habit ticked, 2 for a family activity (Planner "Everyone"; once per day), 1 per parent kudos (max 2/day per child). No win-the-day/week bonus stars; bonus habits give none. Max ≈ 21/week + family activities.
- **Weekly goal:** 12 ⭐ by default (parents can change it in ⚙️ Rewards & points). Each person picks one reward for the week in Win the Day. From **Saturday morning**, if they've reached the goal, it unlocks automatically ("earned") and appears in the parents' "🎉 Earned — to give" list; a parent taps ✅ Given. Nothing is ever "spent".
- **Anti-cheat:** ticks only for today (server allows its UTC date ±1 for time zones); kudos parents-only, never to yourself, capped; the old open `/api/stars` that accepted any amount is locked down; the old redeem route is switched off; unlock only when the phone's "today" is really Saturday+; kids can't change the goal or approve rewards. Still an honesty system for "who's using this phone" (no separate parent PIN).
- New: `src/lib/points.js` (rules), `src/routes/weekly.js` (`/api/weekly`, `/choose`, `/settings`, `/:id/given`), table `weekly_goals` + `families.weekly_goal` auto-created (record: migration 021). Demo family has Mia → Movie night, Jack → park.
- Tested: 13-step parent+child weekly test incl. every cheat attempt, a server clock pinned to Wednesday then Saturday 8am (locked mid-week, unlocks Saturday, parent marks Given), and all earlier journeys.

## ✅ Rewards system + "what day is it" + calendar in step + starter ideas (2026-11-10)

- **Points rules** (`src/lib/points.js`): habit +1, win the day +2, win the whole week (Mon–Sun) +10, family activity (Planner "Everyone") +2, bonus habit +1. Perfect week = 45 ⭐; ~30 ⭐ ≈ one reward a week (suggested price in the add form).
- **Rewards per person + parent override:** a reward can be for one person or anyone. A child's new reward is ⏳ pending until a parent OKs it (and can change the price). Only parents can edit/approve/remove (a child can remove their own pending one). Server checks the role of "who's using this phone" — a family honesty system, not a password. Columns auto-added (record: migration 020).
- **⚙️ Rewards & points** button on the Reward shop = the admin area: points rules, ⏳ waiting for OK, all rewards (title/price/for/remove).
- **Win the Day:** "📅 Today is Tuesday, 10 November", a Mon–Sun strip of days won (today ringed), stars, and progress to *your* next reward. Ticking shows bonuses ("🎉 Day won! +2 ⭐ bonus", family bonus, "🏆 won the whole week").
- **Calendar in step:** habits planned onto days show on the calendar as ⭐ chips (no duplicate when the Planner also made an event); ticks show as dots straight away.
- **Starter ideas:** empty Move/Home lists show 8 starter ideas (tap to add, or Add all) and they appear as picks in the habit editor.
- Tested: parent laptop + child phone (pending → approve → redeem, child blocked from approving, reward for Mia can't be redeemed by Bevan, family bonus, 7-day week bonus), plus all earlier journeys.

## ✅ Family testing day: who's using this phone, meals per person, rewards progress (2026-11-10)

- **👤 Who's using this phone?** Each family member logs into the same family on their own phone and picks themselves (asked automatically when a family has 2+ people and the phone hasn't chosen; button in the top row to change). Stored per device (`ftf_me`). Sets the default habits tab, calendar view (their events + Everyone events), Planner "For", meal voting, AI idea person, and reminders. "We share this device" = everyone.
- **Refresh on return:** coming back to the app reloads the cards (skipped if you're mid-typing or editing habits) so other family members' changes show up.
- **📧 Invite by email / 📋 Copy invite** in Invite family (link + family code; PIN deliberately left out).
- **Meals:** tap a meal → 📅 Move to (any day), For (Everyone / one person), 🗑 Remove; drag between days on a computer. `meal_plan_items.member_id` auto-added (record: migration 019).
- **Win the Day** shows ⭐ stars, "🎁 N more for <next reward>" with a progress bar, and rewards you can already get.
- **Plan my week** moved into the Planner card (for the person showing in Win the Day).
- Tested with two browsers at once (Bevan laptop + Mia phone, same family). All earlier journeys pass.

## ✅ Maddie's 9 notes: Win the Day, pick lists, Planner top 5 → day's habit, AI recipe pictures, cookbook (2026-11-10)

- **Win the Day** is the habits card's new name (they're daily habits).
- **Habit editor pick lists by type:** Move shows Planner movement ideas, Cook shows recipes (favourites first, as "Cook …"), Home shows Planner home ideas. Tap to fill. Typed Move/Home habits are remembered in the Planner lists.
- **Planner:** top 5 most-used per tab (numbered), "+ N more", and **⚙️ Manage** to remove ideas (`DELETE /api/movement-ideas/:id`).
- **Planner → Win the Day:** planning an idea (or a recipe) for a person or Everyone, with a day + time, also makes it **that day's habit** in the matching slot (Move/Cook/Home) via `habit_day_plan.title` (+ time = reminder). Usual weekly habits stay the default every other day. Card shows "📅 today · 4:00 PM". One popup only (habit, with Done) even though a calendar event is also made.
- **AI recipe pictures:** now use Cloudflare Workers AI (`[ai] binding = "AI"` in wrangler.toml, model flux-1-schnell) — no paid key. Made automatically when a recipe is added; your own photo replaces it (newest = cover). OpenAI still used if the AI binding isn't there and a key is.
- **Family Cookbook** lists every recipe by meal (favourites first) with its cover picture, plus photos for the chosen dates; opens loaded.
- Tested end to end on a database without the new columns (auto-added), with a stand-in AI; all earlier journeys still pass. **Not testable here: the real Workers AI call** — check by adding a recipe on the live site.

## ✅ Bonus habits, times on planned habits, popup reminders (2026-11-10)

From Maddie's 💡 note ("add times… popup reminder… more than 3 tasks"):
- **Bonus habits:** up to 2 extra per person (✨ in the habit editor). Ticking one earns a star but it's never needed to win the day — "do all 3 to win" stays the rule. Tables `bonus_habits` / `bonus_completions` are created by the app itself (`src/lib/schemaUpgrades.js`; record in migration 018).
- **Times on planned habits:** in "Plan my week" each planned day has an optional ⏰ time (column `habit_day_plan.time`, also auto-added).
- **Popup reminders (in-app):** while the app is open, today's calendar events and timed planned habits pop up at their time with a chime; habit popups have ✅ Done which ticks it. Only once per device per day; skipped if more than 30 min late. If a person is picked under Notifications ("who's using this device"), only their reminders + whole-family events show. Phone notifications when the app is closed are not built (needs push setup + a scheduled job).
- **Fix:** editing habits used to delete and re-create them, wiping that person's ticks; now updates in place.
- Demo family gets bonus habits too. Tested on a phone in Sydney time with a faked clock (3:58pm → event popup at 4:00, habit popup at 4:05 → Done → day won), on a database without the new tables.

## ✅ 💡 Dev notes: save as you go, export all at once (2026-11-10)

The 💡 tool (turn on once with `?dev=1`) now keeps a list: capture/upload a screenshot + type a note → **➕ Save note**, repeat as many times as you like. Notes are kept in that browser (IndexedDB) so they survive a refresh; the 💡 shows a count. **⬇️ Export all for Claude** downloads one `.md` with every note numbered plus each screenshot as `…-01.png`, `…-02.png` (numbers match). Also **📋 Copy all text** and two-tap **🗑 Clear all**. Tested: save, refresh, export contents, delete, clear.
Also: the Google Calendar panel now says plainly when Google linking isn't switched on (no keys on the server) instead of a broken Connect button.

## ✅ "Try a demo family" button + fixed habit ticks landing on yesterday (2026-11-10)

- Login screen now has **👀 Try a demo family**. Each tap builds a brand-new private "Smith Family" (Sam, Mia, Jack) dated around the visitor's own today: a full week on the calendar, Mia on a 4-day streak with 2 of 3 done (tick the last one live for "Day won! 🔥 5 day streak"), stars and rewards, popular Planner ideas, recipes, this week's meals, shopping list and check-in notes. Code is shown on screen; PIN is 0000. Built in `src/lib/demoSeed.js`, route `POST /api/family/demo`. Uses only existing tables — no migration needed.
- **Bug fixed:** ticking a habit didn't send the phone's local date, so the server used UK time. In Australia before 11am that's yesterday, so morning ticks were saved to the wrong day ("Already ticked off for today"). Now sends the local date.
- Tested on an iPhone-sized browser in Sydney time against a local copy of the API: every card populated, two visitors get separate copies, logging back in with code + 0000 works, and the full sign-up journey still passes.

## ✅ Demo-night end-to-end test + fixes (2026-11-10)

Tested the full journey on an iPhone-sized browser against a local copy of the API with a fresh database built from every migration (sign up → add a child → pick 3 habits → win the day → stars → calendar event → planner → expand calendar → reward → recipe → meal → shopping → refresh → log out/in → wrong PIN). Everything passed once these were fixed:
- Family code now shown straight after sign-up ("Your family is ready!" panel).
- Sign-up/login buttons disable while working (double-tap made two families); Enter submits.
- 5 wrong PINs → 10-minute pause (migration 017; login still works if it's not run).
- First member gets a colour; calendar chips show title first; Expand on a phone = day-by-day list with times.
- Dev-note 💡 hidden unless the app is opened once with `?dev=1`.
- `/api/health` now shows which optional features (AI, Google Calendar, push) are configured.
Still worth a live check: the real site after migration 017, on a real phone.

## 🚧 Planner: 🏡 Home tab + popularity sorting (2026-11-04)
Two additions to the Planner card:
- A third **🏡 Home** tab, alongside Movement and Favourite recipes, for chores like "Tidy room" or "Set the table" — works exactly like Movement (remembered per family, drag/tap onto the calendar), just its own list and its own "+ Add". Dropping one creates a calendar event tagged with the Grow 🌱 pillar instead of Move.
- Both Movement and Home ideas now track how many times they've actually been scheduled, and the palette sorts most-used-first — so "Netball" (used every week) rises above a one-off idea that was only tried once. New `use_count` column, bumped (best-effort, never blocking) whenever an idea is dropped/tapped onto a day.

Technically: `movement_ideas` table extended with `category` ('movement'/'home') and `use_count` columns (migration 016) rather than a new table — same data shape, just filtered/sorted differently per tab. Verified with the same headless-browser approach as today's other changes (loaded the page, rendered both palettes with fake data, switched tabs, opened the confirm panel) — no crashes. Still needs a live pass: add a Home idea, schedule it, confirm it moves up the list after a second use.

## 🚧 Habit card redesign: "win the day" is now stated up front (2026-11-04)
Maddie reviewed a before/after mockup and approved it — now built into the real app:
- A "🎯 Do all 3 to win the day!" badge sits right under the card title, so the goal is visible before you start, not just celebrated after.
- "2 of 3 practised today" (a fraction) replaced with filled/empty dots (●●○) plus a short line ("So close!" / "Day won! 🎉") — reads instantly, no mental maths.
- Habit rows and empty slots now lead with a bigger emoji instead of a tiny all-caps MOVE/COOK/HOME label.
- "Plan my week" (the drag/tap-a-habit-onto-a-day feature from earlier today) is now collapsed behind a "📅 Plan my week ▾" toggle per person, closed by default — keeps the daily view to just the 3 habits + win celebration, since planning is a once-a-week task not a daily one.
- "Need an idea?" now asks "How are **you** feeling?" instead of "How are **they** feeling?" — it's usually the kid tapping it themselves.

Purely a display/copy change — same API data, same completion/streak logic underneath. Verified with the same headless-browser approach as the last two changes (loaded the page, called the new render logic directly with fake data) — no crashes. Still worth a quick live look once the migrations below are run.

## 🚧 Calendar view switcher: 1 week / 2 weeks / month (2026-11-04)
The big Calendar card now defaults to showing just **this week** (Mon–Sun) instead of jumping straight to a full month grid — much less overwhelming, and "Month Year" with no real content on a fresh account was confusing. Three small tabs above the grid ("1 Week" / "2 Weeks" / "Month") switch between them; ‹ › still step forward/back, by whatever the current view's size is (a week, two weeks, or a month). Switching into a week view always re-centres on today's week. Purely a display change — no new data, no schema change. Verified directly (headless browser, calling the render function in all 3 modes + stepping forward/back) rather than just checked for syntax errors, so this one's more trustworthy than most of today's 🚧 items, but still worth a quick look live.

## 🔧 Fixed: a broken deploy wiped the whole app (2026-11-04)
The commit that relocated "Family members" and "Need an idea?" below the Calendar accidentally deleted their HTML instead of moving it, leaving `$("showAddMemberBtn")` pointing at nothing. That threw on page load and halted all script execution after it — breaking login, the Planner, and everything else wired up later in the file. This is also why login looked like it "wasn't remembering" sessions: the token was being saved fine the whole time, but `boot()` (the code that checks for a saved token on page load) never got to run. Restored both cards' markup. **Process change going forward**: before every push now, the page is loaded in a local headless browser to catch any JS crash like this one immediately, not just a syntax check — this exact bug would have been caught before reaching Maddie.

## 🚧 Plan the week for habits (2026-11-04)
Under each person's 3 chosen habits, a new "Plan the week" section: the habits they've chosen show as tappable/draggable chips, and a Mon–Sun list below (same style as This Week's Meals) is where you drop or tap one onto a specific day — e.g. "Move" planned for Tue/Thu only, not every day. Purely a planning aid — ticking a habit off "today" still works exactly the same regardless of what's planned for that day. New `habit_day_plan` table (migration 015, not yet run by Maddie). Not yet tested live.

## 🚧 Planner card (2026-11-04)
New "📋 Planner" card, in the spot right between Habits and Calendar previously held by "Family members" and "Need an idea?" (those two moved down, now sitting right after the Calendar instead). The Planner has two tabs:
- **🏃 Movement**: a palette of movement ideas you tap (mobile) or drag (desktop) onto the calendar below. This list isn't hardcoded — it starts empty and **remembers** whatever a family adds via the "+ Add" box, so it actually grows into this family's own list of things they do (a walk, netball, bike ride...), not a generic suggestion list. New `movement_ideas` table, one row per family per idea, de-duplicated by title.
- **🍳 Favourite recipes**: shows whatever's been ⭐ favourited in Recipes — no new data, just a filtered view, so a family's go-to meals are one tap away from being scheduled.

Dropping or tapping an idea always opens a small confirm panel asking for a day (and, for a movement idea, a time — recipes go straight onto a meal-plan day instead, no time needed, since meals already have a "when" of breakfast/lunch/dinner/snacks) and, for movement, who it's for: 🌍 Everyone (tags the whole family, shows on every member's calendar) or one specific person — matching the "family walk tags everyone, but my own 5k run stays just mine" example. Confirming a movement idea creates a normal calendar event; confirming a recipe reuses the exact same "schedule this recipe" flow as the Recipes card (including the automatic shopping-list sync).

New migration `014_movement_ideas.sql` (not yet run by Maddie). Not yet tested live — needs a pass adding a custom movement idea, dragging/tapping it onto a day with a time and a "for" choice, and doing the same for a favourite recipe.

## 🚧 Weekly recurring events (2026-11-04)
"+ Add an event" now has a simple 🔁 "This happens every week (like netball)" checkbox — tick it and an "Until when?" date appears (defaults to 3 months out, a typical season length, so a kid isn't stuck guessing a date). The calendar expands a repeating event into one chip per week, every week, up to that date — deliberately kept to one simple weekly-repeat-until-a-date model, not a full recurrence-rule picker, to stay usable for an 8-year-old. Deleting a repeating event deletes the whole series (the confirm dialog says so) — editing/deleting a single occurrence isn't supported, out of scope for now.

Technically: the `events.recurrence` column already existed in the schema (added for this, apparently, a while back) but had never actually been wired up to anything — nothing read it. This is genuinely new functionality, not a bug fix. No new migration needed, no schema change. Occurrences are computed client-side at render time (not stored as separate rows), so editing the "until" date or the original event instantly reflects everywhere. Not yet tested live.

## 🚧 Habit streaks, "day won", always-3-slots, Google Calendar bonus items, auto shopping list (2026-11-04)
Several related changes to This Week's Habits and the shopping list:
- **Always 3 slots**: a person's habit card always shows all 3 slots now, even unfilled ones — an empty slot shows a dashed "+ Add a [Move/Cook/Home] habit" row instead of just not appearing, so it's obvious 3 are expected.
- **Day won + streaks**: ticking off all 3 habits in a day now shows a "🎉 Day won!" badge and a toast, and advances a running streak (🔥 shown next to the person's name) — +1 if yesterday was also won, back to 1 after a gap. New `habit_streaks` table (one row per person), updated inside `completeHabit`.
- **Google Calendar items as bonus checklist items**: if the family has Google Calendar connected, today's events from that calendar show up under the habits as extra tickable items (📅 icon), separate from the 3 typed habits. New `GET /api/calendar/google/today-items` + `POST .../complete`, backed by a new `calendar_item_completions` table. Deliberately does **not** count toward "day won"/streaks — the Google connection is family-wide, not per-person, so attributing it cleanly to one person's streak felt like guessing; typed habits stay the sole win condition. Gracefully shows nothing (no error) if Google isn't connected.
- **Shopping list now updates automatically**: scheduling a recipe onto the weekly meal plan (drag onto the calendar, or "Cook this" → Add to meal plan) now adds its ingredients to the shopping list automatically, instead of needing a separate "🛒 Add ingredients" tap afterward (that button still exists too, for re-adding).

Needs migration `013_streaks_and_calendar_items.sql` run on the real DB. Not yet tested live — needs a full pass: tick all 3 of a person's habits and confirm the streak badge appears, check an empty slot's "+ Add" prompt, and (if Google Calendar is connected) confirm today's events show up and tick off correctly.

## 🚧 Per-person tabs + tag-everyone on events and habits (2026-11-04)
Two related changes:
- **This Week's Habits** now shows one person at a time via tabs above the list, instead of every family member's habits stacked in one long card — scales properly once a family has more than one member.
- **Calendar events** can now be tagged to specific several people at once ("Mum and Sarah at the park"), not just one person or the whole family. The "For" field on "+ Add an event" is now a checklist: a 🌍 Everyone checkbox (default, for group activities — dynamically means whoever's in the family, including anyone added later) plus one checkbox per person, mutually exclusive with Everyone. The calendar also gets a row of person tabs above the grid to filter it down to just one person's events + habit dots, or "All".

New table `event_members` (migration 012, not yet run by Maddie) backs the multi-person case — a single-person event still just uses the existing `events.member_id` column unchanged, and a whole-family event still just means `member_id IS NULL` with no join-table rows, so no existing event changes meaning. `GET /api/events` now also returns each event's `memberIds` array. Not yet tested live — needs a pass adding an event tagged to 2+ specific people, one tagged Everyone, and switching between the new person tabs on both the calendar and This Week's Habits.

## 🚧 Habit completions shown on the calendar (2026-11-04)
Each ticked-off habit now shows as a small coloured dot on that day in the month calendar — one dot per person per completed habit, colored by that member's own color, with a hover tooltip naming who and which habit. New `GET /api/habits/completions` endpoint (unscoped by date, same pattern as `/api/events` — fetched once per calendar load and cached client-side) joins `habit_completions` to `weekly_habits` for the title/emoji. Purely additive — no schema change, `habit_completions` already recorded per-day completions, this just surfaces it visually. Not yet tested live.

## 🚧 Lunchbox builder + 6 example recipes (2026-11-04)
New "🎒 Build a lunchbox" button next to "+ Add a recipe": a lunchbox is 5+ small separate items (fruit, veg sticks, a sandwich, a snack bar...), which is awkward to type as one free-text ingredient list, so instead there's a palette of ~16 common lunchbox items you tap (mobile-friendly) or drag (desktop) into a box, plus a "+ Add your own item" field for anything not in the palette. Saving it creates a normal recipe behind the scenes (category: `lunchboxes`, ingredients = the chosen items, one auto-generated step), so it gets every existing recipe feature for free — shows as a polaroid card, drags onto the calendar, adds its items to the shopping list, appears in the Family Cookbook under Lunchboxes. No schema change — reuses the existing `recipes` table and `POST /api/recipes` endpoint.

Also added 6 example recipes (SQL given to Maddie to paste into D1, not yet confirmed run): Chicken Schnitzel & Mash, Overnight Oats with Yoghurt & Berries, Eggs on Toast, Avocado on Toast, Nachos, Pizza Night — real ingredients/steps, no photos attached (R2 isn't reachable from the build environment, so photos need to go in via the app's own "📷 Add photo" button, which already works).

Worth noting: the app already has a real "✨ AI photo" feature (`/api/ai/image`, DALL-E 3) — it's just gated behind an `OPENAI_API_KEY` Cloudflare secret that hasn't been added yet (needs a parent with billing set up on platform.openai.com). Once that's added, AI photos work with no further code changes.

🚧 because none of this has been tested live yet — needs a pass clicking through the lunchbox builder (including the drag-and-drop on an actual desktop browser) and confirming the 6 recipes imported correctly.

## Fixed: a failed card could silently log you out (2026-11-04)
Found via a real screenshot from Maddie's own "Walker" account: the login screen and the home screen were both showing at once. Root cause — `loadHome()` loaded every card with one `Promise.all`, so if any single card's fetch failed (in this case: "This week's meals" calling `/api/meal-plan`, which errors because the `meal_type` column from migration 011 hadn't been run on the real database yet), the whole `Promise.all` rejected, which `boot()` treated as "not logged in" — clearing the saved login token and showing the auth screen **on top of** the already-rendered home screen (which never got hidden). Fixed two ways: (1) each home-screen card now loads independently and catches its own errors (one broken card shows a toast, the rest of the page still works), (2) `boot()` only clears the saved login and shows the auth screen for an actual 401/403 from the server, never for an unrelated error. The specific trigger (missing `meal_type` column) is fixed by running the migration below — but the underlying bug (one failed fetch = silent full logout) was real and is now fixed regardless.

## Habit slots labelled Move / Cook / Home (2026-11-04)
The 3 weekly habit slots now carry a soft category label instead of being undifferentiated — slot 1 is "Move", slot 2 "Cook", slot 3 "Home". Kids still type their own specific habit per slot (no restriction, same as before), the label is just a gentle nudge shown in the edit form (with a slot-appropriate placeholder example) and as a small tag next to each habit in "This Week's Habits". Chosen to be understandable at a 7-year-old reading level (concrete verbs/nouns, not "Movement"/"Wellbeing"), and each one traces to a specific dietitian-research finding: Move → daily movement (biggest-impact habits list), Cook → "involvement, not instruction" (the single most repeated theme across all 16 responses), Home → the screen-time section's advice to replace screens with a real alternative, not just remove them. No schema change — `weekly_habits.slot` already existed, this is purely a labelling/UI change.

## Dev note tool — 💡 button for flagging changes (2026-11-04)
Added a small floating 💡 button (bottom-right, on every screen, deliberately styled unlike the rest of the app so it reads as a build tool, not a family feature). Click it to: capture a screenshot of one section (click "📐 Capture a section" then click the part of the page you mean), capture the whole page, or upload your own image; write a text note describing what should change; then "⬇️ Export for Claude" downloads a PNG (if there's a screenshot) and a .md note (page URL, viewport size, what was captured, and your note) — drag both into a Claude chat in one go. Uses html2canvas (CDN) for in-browser screenshots, purely client-side — doesn't touch the app's API or any family data. Not yet tested live — screenshot rendering quality can vary by browser, worth checking once before relying on it for the real page design (the CSS gradients/shadows mostly render fine with html2canvas, but anything using newer CSS can occasionally come out slightly off).

## Meal plan sorted by Breakfast/Lunch/Dinner/Snacks + sorted Family Cookbook (2026-11-04)
This Week's Meals now groups each day into Breakfast/Lunch/Dinner/Snacks sections instead of one flat list. Cooking a recipe (via "Cook this" or dragging it onto the calendar) auto-picks the meal type from the recipe's own category; manually "suggesting a meal" now has a meal-type dropdown (defaults to Dinner). Needs migration `011_meal_plan_meal_type.sql` run in the D1 console (adds `meal_type` to `meal_plan_items`) — meals planned before that migration show under a 5th "Other" section until re-tagged. The Family Cookbook photo grid is now grouped the same way (Breakfast/Lunch/Dinner/Snacks/Lunchboxes, plus a "Family moments" section for habit photos not tied to a recipe).

Also fixed a real pre-existing bug while in this code: `GET /api/meal-plan` was returning `recipe_id` (snake_case) but the frontend read `item.recipeId` (camelCase) — meaning "🛒 Add ingredients" on a planned meal, and the new "Add this week's ingredients" button, never actually found a recipe to pull ingredients from. Fixed by aliasing the SQL columns to camelCase.

## Drag recipes to the calendar + weekly shopping list (2026-11-04)
Recipe polaroid cards can now be dragged straight onto a day in the month Calendar to plan cooking it that day (same effect as the existing "Cook this" button, just as a drag gesture) — desktop/mouse only, since phones don't support native drag-and-drop; the "Cook this" button + date picker in the recipe detail panel is the mobile-friendly equivalent and still works everywhere. Also added a "🛒 Add this week's ingredients to shopping list" button on This Week's Meals that pulls every recipe-linked meal planned for the week and adds all their ingredients at once (skipping anything already on the list), instead of one recipe at a time. The shopping list's checkboxes and delete buttons are now bigger touch targets for mobile. You can also now drag an image file straight onto a recipe's polaroid photo to upload it (desktop), as an alternative to the existing tap-to-upload / AI photo buttons. Not yet confirmed live by Maddie.

## Polaroid-style recipe cards + Family Cookbook (2026-11-04)
Redesigned the Recipes list as a wall of polaroid-style cards: a photo on top (uploaded via 📷 or generated via ✨ AI), a handwritten-style caption with the recipe title below, slight alternating tilt per card. Tapping a card opens a detail panel (ingredients, steps, Cook this/Favourite/Edit/Add photo/AI photo) — same actions as before, just moved out of the cramped row menu. Added a new `/api/recipes/cover-photos` endpoint (most recent photo per recipe) so cards can show a real cover image without an extra request per card. The Family Cookbook photo grid got the same polaroid treatment (photo + handwritten caption of the recipe or activity + who/when), so recipes and "photos of us cooking it" now share one consistent look. No existing recipe/photo/meal-plan functionality removed. Syntax-checked, not yet confirmed live by Maddie.

## Demo family for presentations (2026-10-29)
Added a separate demo family ("The Johnsons", join code `NJ6KB9`, PIN `2468`) via hand-written SQL run through the Cloudflare D1 console, so Maddie can show the app working without touching her real "The Walkers" data. Includes 4 members with interests/colors, 3 weekly habits each, some habits ticked off today with real star-ledger entries (plus a few bonus kudos stars), 8 calendar events over the next two weeks, 4 reward shop items, 3 recipes, 5 meal plan items for the current week (with votes and one "together" meal), and a 5-item shopping list (2 checked). Schema-verified against every relevant migration file and the real route code before handing over; PIN hash verified by recomputing PBKDF2 in Python and checking it matches. Not yet confirmed by Maddie logging in and looking.

## Compact dashboard redesign (2026-10-27)
Reworked the home screen layout for density/hierarchy per Maddie's written spec — no features removed, no rebuild, same APIs/IDs. Habits moved to the top, join code/notifications/Google Calendar collapsed into a settings row, family members compacted, Reward Shop/Recipes/Meals/Shopping/Memories/Cookbook paired into 2-column groups on wide screens, recipe actions moved behind a ••• menu, Family Cookbook and Weekly Check-in (renamed from "Family meeting") collapsed by default, meals shown as a compact Mon-Sun row list. Syntax-checked and pushed 2026-10-27 — **not yet confirmed live by Maddie**, needs a real look-over on her end.

---

## Infrastructure
| Item | Status | Notes |
|---|---|---|
| GitHub repo created & connected | ✅ | `inhouseav/habitquest`, empty repo cloned 2026-10-24 |
| Cloudflare Worker project | ✅ | Live at https://habitquest.ihav.workers.dev — deployed, public URL enabled, confirmed working 2026-10-24 |
| Static site + API scaffold | ✅ | `src/worker.js` serves `public/` and handles `/api/health` — tested live, returned `{"ok": true, ...}` on 2026-10-24 |
| D1 database | ✅ | Real database `habitquest-db` (id `2fa8326b-db8d-4a92-99c0-83a24b7d2a86`) created, bound, and schema applied via the Cloudflare D1 console on 2026-10-24. All 5 tables confirmed present (`families`, `members`, `events`, `star_ledger`, `recipes`). Live `/api/health` check confirmed `db_binding_present: true` and `db_reachable: true`. |
| R2 bucket (photos) | ✅ | Real bucket `habitquest-photos` created via the Cloudflare dashboard on 2026-10-25, binding uncommented in `wrangler.toml` and deployed. Not yet confirmed by a live photo upload test. |

## Core features (Sessions 1–5 scope)
| Item | Status | Notes |
|---|---|---|
| Family PIN/passcode login | ✅ | Join code + PIN (PBKDF2-hashed), D1-backed sessions. **Tested live 2026-10-24** — Maddie created a real family ("The Walkers"), logged in, and it persisted. |
| Shared family calendar (server-backed) | ✅ | `/api/events`, rendered as a real month grid (like a standard calendar app) with color-coded event chips, month navigation, and today highlighted — not just a flat list. **Tested live** — Maddie added a real event ("Walking Benji", tagged "move") and it showed up correctly; grid view added 2026-10-24 after Maddie asked for a proper calendar look. |
| Family members (add/list) | ✅ | **Tested live** — Maddie added 2 extra members ("jim", "jam") with auto-assigned colors. |
| Star ledger (give-a-star button) | ✅ | **Tested live** — stars visible per member in the UI. |
| Personal Weekly Habits (replaces Fuel/Move/Grow) | 🚧 | Each family member now picks their OWN 3 habits (any title + emoji, e.g. "Walk Benji for 20 mins") instead of fixed Fuel/Move/Grow categories — closer to the connected-system vision (Phase 1 of the rework). Tick-circle rows, "X of 3 practised today" wording instead of "Won the day!", and an inline "Choose/Edit habits" form per member. Awards 1 star per tick, duplicate-proof, same as before. Old Fuel/Move/Grow code and `daily_pillars` table are left untouched (not deleted) so no history is lost. Code written, syntax-checked, **not yet tested live** — needs the 006 migration run first. |
| Recipes module | 🚧 | `/api/recipes` (list/create/edit) built, ingredients/steps as simple line lists, wired into the UI. Has category tabs (All/Breakfast/Lunch/Dinner/Snacks/Lunchboxes) above the list, and a category field on the add-recipe form. **Tested live 2026-10-25** — Maddie confirmed the Recipes card loads and works after the pending migrations were run. A ✏️ Edit button on each of your own recipes (not shared/global ones) reuses the same form to save changes via PUT. |
| AI recipe intake (photo scan + "AI fill" from a name) | 🔒 | Built 2026-10-25: `/api/ai/recipe-from-photo` (📷 Scan a recipe photo — upload a photo of a cookbook page/recipe card/packet, AI drafts the title/ingredients/steps/category for you to review before saving) and `/api/ai/recipe-from-name` (✨ AI fill — type a dish name, AI drafts the rest). Both gated behind `ANTHROPIC_API_KEY`, same as the AI assistant — shows a friendly "not set up yet" message until that's added. Never auto-saves; always fills the form for the family to check and edit first. |

## Extended features (Sessions 6–14 scope)
| Item | Status | Notes |
|---|---|---|
| Meal planning / voting | 🚧 | `/api/meal-plan` built: propose a meal for a day, anyone can vote (toggle). Recipes now connect in — each recipe card has a "🍳 Cook this" button that adds it straight to the meal plan for a chosen day. Added 2026-10-25: a "We're all eating this together" checkbox when suggesting a meal (and a toggle on existing meals), plus a gentle "X family meals together this week!" counter — directly from the dietitian research finding that eating together regularly matters more than any single food choice. No guilt/shame framing — just a count. Not yet tested live. |
| Shopping lists | 🚧 | `/api/shopping` built: add, check off, delete, shared across the family. Any meal plan item linked to a recipe now has a "🛒 Add ingredients" button that pushes that recipe's ingredients onto the list (skips ones already there). A "📋 Copy list for Woolworths/Coles" button copies the unchecked items as plain text to paste into either app — **honest limit:** neither supermarket has a public way to add items automatically from another app, so this is copy/paste, not a real one-tap export. Not yet tested live. |
| Weekly family meetings | 🚧 | `/api/meetings` built: one notes doc per family per week (Monday-starting). Not yet tested live. |
| Reward shop | 🚧 | `/api/rewards` built: parents add rewards with a star cost, any member can redeem (spends stars via the same ledger, can't go negative). Not yet tested live. |
| Family Cookbook (photos + favourites) | ✅ | Built 2026-10-25: `/api/photos` (upload/fetch/delete, real family photos, free — stored in R2), `/api/recipes/:id/favorite` (star a recipe), `/api/cookbook` (compiles favourited recipes + photos for a date range, with a Print button). Each recipe card gets 📷 Add photo, ☆ Favourite, and ✨ AI photo buttons. R2 bucket `habitquest-photos` created 2026-10-25 and binding live — real photo uploads work. |
| AI-generated recipe photos | 🔒 | `/api/ai/image` built 2026-10-25, uses `dall-e-3` (switched from `gpt-image-1`, which needs OpenAI org verification too). **On hold 2026-10-27, Maddie's call** — turns out `dall-e-3` *also* needs OpenAI's organization ID-verification step on a new account (confirmed live: "The model 'dall-e-3' does not exist" until verified), and Maddie decided not to do that ID check for now. The ✨ AI photo button now shows a friendly explanation instead of that raw error. Real photo uploads (📷 Add photo) work today, for free, with no extra steps — that's the recommended path. If verification is ever done later, this should work as-is. |
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
