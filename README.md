# Fuel the Fun (HabitQuest V2 — "GrowCrew")

Maddie's Tobias Project: a healthy-habits app for kids 7–12, built for real as a Cloudflare Pages + Workers + D1 + R2 app.

- **PROJECT_BRIEF.md** — what this is, who it's for, hard rules.
- **DECISIONS.md** — every real decision made and why.
- **BUILD_STATUS.md** — honest status of every feature (nothing marked done unless tested).
- **TEST_LOG.md** — every real test performed.
- **TOBIAS_JOURNAL.md** — running journal for the Tobias project write-up.

## Local structure
- `public/` — static frontend (Cloudflare Pages)
- `functions/api/` — server-side endpoints (Cloudflare Pages Functions / Workers)
- `db/schema.sql` — D1 database schema
- `wrangler.toml` — Cloudflare configuration (contains placeholders until the real Cloudflare project/D1/R2 are created — see BUILD_STATUS.md)

## Setup (not yet done — tracked in BUILD_STATUS.md)
1. `wrangler login`
2. `wrangler d1 create habitquest-db` → paste the real `database_id` into `wrangler.toml`
3. `wrangler d1 execute habitquest-db --file=./db/schema.sql`
4. `wrangler r2 bucket create habitquest-photos`
5. Connect this GitHub repo to a new Cloudflare Pages project (build output directory: `public`, Functions directory: `functions`)
