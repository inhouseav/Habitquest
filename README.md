# Fuel the Fun (HabitQuest V2 — "GrowCrew")

Maddie's Tobias Project: a healthy-habits app for kids 7–12, built for real as a Cloudflare Worker (static assets + API) + D1 + R2 app.

- **PROJECT_BRIEF.md** — what this is, who it's for, hard rules.
- **DECISIONS.md** — every real decision made and why.
- **BUILD_STATUS.md** — honest status of every feature (nothing marked done unless tested).
- **TEST_LOG.md** — every real test performed.
- **TOBIAS_JOURNAL.md** — running journal for the Tobias project write-up.

## Local structure
- `public/` — static frontend, served as assets
- `src/worker.js` — single Worker entry point: serves static files and handles API routes (e.g. `/api/health`)
- `db/schema.sql` — D1 database schema
- `wrangler.toml` — Cloudflare configuration. D1 and R2 bindings are commented out until those resources actually exist (see below) — an uncommented binding to a non-existent resource makes `wrangler deploy` fail.

## Setup (not yet done — tracked in BUILD_STATUS.md)
1. `wrangler login`
2. `wrangler d1 create habitquest-db` → paste the real `database_id` into `wrangler.toml`, then uncomment the `[[d1_databases]]` block
3. `wrangler d1 execute habitquest-db --file=./db/schema.sql`
4. `wrangler r2 bucket create habitquest-photos`, then uncomment the `[[r2_buckets]]` block
5. Deploy command for this Cloudflare Worker project: `npx wrangler deploy` (this is the default — no Pages-specific command needed)
