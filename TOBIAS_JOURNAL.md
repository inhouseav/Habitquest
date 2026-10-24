# Tobias Project Journal

A running log of real decisions and progress, for Maddie's Tobias project documentation.

---

## 2026-10-24 — V1 frozen, V2 kicked off
Before starting any V2 work, we froze the current app (V1) as a permanent backup, so nothing from the original Tobias build can be lost. V1 includes the calendar-first redesign, dynamic family members, the "Pick 3 Habits for the Week" system, and the IDEA → ACTION challenge system.

Then I reviewed a 14-session build guide for turning the app into a full family app — real accounts, a shared calendar, a proper star-reward system, recipes, meal planning, a reward shop, photo memory books, calendar sync, notifications, and an AI planning helper. I chose to try to build everything in the guide rather than a smaller slice, even though it's a bigger challenge for my deadline.

Because the current app is a single file with no real server, it can't actually do things like share data between devices, log in multiple family members securely, or keep secret API keys safe. So we're moving the real backend onto Cloudflare — I already had a GitHub and Cloudflare account from another project, so we're reusing those accounts but starting a brand-new, separate project just for Fuel the Fun.

Today I connected my GitHub account properly (it needed both a login connection AND installing the "Claude GitHub App" separately — I didn't realize those were two different steps at first) and got the new empty repository connected and cloned. This is the real starting point for Session 1 of the build guide: setting up the project documents and the first piece of real infrastructure.

**What I learned:** Connecting accounts for a real project has more steps than I expected — it's not just "log in once." Also, being honest about what's really built vs. what's still a plan is going to be really important for this project, since the guide itself says never to fake something and call it finished.

## 2026-10-24 — First deploy, and my first real crash to debug
I set up the Cloudflare side myself by clicking through the dashboard. The first deploy actually failed — Cloudflare's "Connect GitHub" flow built my project as a newer kind of "Worker" instead of the older "Pages" style the code was written for, so when it tried to launch, it used the wrong instructions and crashed. I sent screenshots of the error and we fixed the actual code to match what Cloudflare expected, then I retried the build and it worked.

Then I still couldn't see my app — it turned out there's a separate on/off switch for making a Worker's web address public, buried under the "Domains" tab. Once I found and flipped that, I opened the link and pressed the test button myself — and it said `"ok": true`. My app is genuinely live on the internet now, not a demo.

**What I learned:** Deploying something for real involves more small decisions than I expected — the dashboard doesn't do everything for you, and reading error logs (even when I don't fully understand them) is how you find the next thing to fix. I also learned that "it crashed" usually means one specific small thing is wrong, not that the whole thing is broken.
