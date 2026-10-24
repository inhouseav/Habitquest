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
| D1 database | 🚧 | Real database `habitquest-db` created on Cloudflare 2026-10-24 (id `2fa8326b-db8d-4a92-99c0-83a24b7d2a86`) and bound in `wrangler.toml` — but the schema (`db/schema.sql`) hasn't been run against it yet, so it's empty. `/api/health` should now report `db_binding_present: true` once redeployed, but `db_reachable` will stay false until the tables exist. |
| R2 bucket (photos) | ⛔ | Not started; binding commented out for the same reason as D1 |

## Core features (Sessions 1–5 scope)
| Item | Status | Notes |
|---|---|---|
| Family PIN/passcode login | ⛔ | Not started |
| Shared family calendar (server-backed) | ⛔ | Not started |
| Fuel/Move/Grow daily "Daily Three" pillars | ⛔ | Design carries over from V1's MOVE/MAKE/OUTSIDE + "Pick 3 Habits" system |
| Star ledger (spendable + lifetime balances, no duplicate awards) | ⛔ | Not started |
| Recipes module | ⛔ | Not started |

## Extended features (Sessions 6–14 scope)
| Item | Status | Notes |
|---|---|---|
| Meal planning / voting | ⛔ | Not started |
| Shopping lists | ⛔ | Not started |
| Weekly family meetings | ⛔ | Not started |
| Reward shop | ⛔ | Not started |
| Photo memory books | ⛔ | Not started — needs R2 |
| External calendar sync (Google Calendar) | 🔒 | Needs Google Cloud Console app registration — external setup required before any code is written |
| Push notifications | 🔒 | Needs Web Push/VAPID key setup — external setup required |
| AI planning assistant | 🔒 | Needs a Worker-side AI adapter + API key — external setup required |

## V1 (frozen, untouched)
| Item | Status | Notes |
|---|---|---|
| V1 snapshot | ✅ | Frozen 2026-10-24. See claude.ai Tobias project doc `claude/version-snapshots.md` for revert instructions. |

---
*Last updated: 2026-10-24 — Session 1 complete. Live app confirmed working at https://habitquest.ihav.workers.dev.*
