# Test Log

Every real test performed, with date, what was tested, and result. No feature gets marked ✅ in BUILD_STATUS.md without an entry here.

---

## 2026-10-24
- **Test:** V1 snapshot integrity check.
  **Method:** `md5sum` comparison of working file vs. snapshot copy; extracted longest `<script>` block and ran `node --check` on it.
  **Result:** PASS — identical checksums (`4b4a75d2a86e556860990aded4994457`), JS syntax valid.
- **Test:** GitHub repo attach + clone.
  **Method:** `add_repo` then `git clone --depth 1` of `inhouseav/habitquest`.
  **Result:** PASS — repo attached with push access, cloned successfully (confirmed empty, as expected for a new repo).
- **Test:** First Cloudflare deploy of the Worker (Pages-style config).
  **Method:** Connected `inhouseav/habitquest` to a new Cloudflare Worker project via the dashboard's "Connect GitHub" flow, deployed with default settings.
  **Result:** FAIL — build failed at the "Deploying" step. Cause: the repo's `wrangler.toml`/folder layout was written for the old separate "Pages" product, but Cloudflare's current project creation flow builds a unified Worker (Compute) project, which expects a single `main` entry point + `[assets]` binding instead.
- **Test:** Second Cloudflare deploy, after switching to `src/worker.js` + `[assets]` config and commenting out the not-yet-created D1/R2 bindings.
  **Method:** Pushed fix to GitHub, clicked "Retry build" in Cloudflare dashboard.
  **Result:** PASS — build succeeded, "Bindings: 1 (ASSETS)" shown.
- **Test:** Public URL + live health check.
  **Method:** Enabled the `workers.dev` Production toggle under the Worker's Domains tab, visited https://habitquest.ihav.workers.dev, clicked "Check API connection" on the live page.
  **Result:** PASS — page rendered correctly in the Calm & Clear design, and `/api/health` returned `{"ok": true, "service": "habitquest-api", "db_binding_present": false, "db_reachable": false, "photos_binding_present": false}` — correctly reporting that D1/R2 aren't wired up yet, exactly as BUILD_STATUS.md says.

- **Test:** Real D1 database creation and binding.
  **Method:** Created `habitquest-db` directly via Cloudflare dashboard (Worker → Settings → Bindings → Add binding → D1 Database → create new), which auto-attached it to the live Worker. Updated `wrangler.toml` with the real `database_id` to match.
  **Result:** PASS — binding created successfully.
- **Test:** Schema creation.
  **Method:** Pasted the full contents of `db/schema.sql` into the D1 dashboard's Console tab and executed it, then ran `/tables`.
  **Result:** PASS — all 5 expected tables present: `families`, `members`, `events`, `star_ledger`, `recipes`.
- **Test:** End-to-end live health check after schema creation.
  **Method:** Visited https://habitquest.ihav.workers.dev, clicked "Check API connection."
  **Result:** PASS — `{"ok": true, "service": "habitquest-api", "db_binding_present": true, "db_reachable": true, "photos_binding_present": false}`. Database is genuinely live and queryable from the deployed Worker.

**Session 1 is complete and fully verified live — real Worker, real static site, real D1 database with schema applied, all confirmed end-to-end.** Next: Session 2 (family PIN login, shared calendar, star ledger — pure code work, no more dashboard setup needed).

- **Test:** Sessions 2 core features (login, members, calendar, star ledger).
  **Method:** Maddie created a real family ("The Walkers"), logged in, added members (jim, jam), added a calendar event, gave stars.
  **Result:** PASS — all persisted correctly through a real session.
- **Test:** Calendar redesigned as a month grid, then event owner labeling added.
  **Method:** Maddie compared the live calendar to a reference screenshot and requested changes; both iterations deployed and viewed live.
  **Result:** PASS — calendar now renders as a proper month grid with color-coded, member-labeled event chips.
- **Test:** Push notifications (hand-rolled Web Push — VAPID JWT signing + RFC 8291 aes128gcm encryption via Web Crypto API, no npm package or third-party account).
  **Method:** Ran a local Node script simulating a browser subscription, encrypting a real payload and decrypting it independently to prove the crypto was correct *before* shipping. Then Maddie ran migration `004_push_subscriptions.sql`, added the `VAPID_PRIVATE_JWK` secret in the Cloudflare dashboard, enabled notifications on her Mac in Chrome, and tapped "Send a test."
  **Result:** PASS (after one real troubleshooting step) — first attempt showed "Sent to 2 device(s)!" from the server but no visible banner; root cause was macOS Focus/Do Not Disturb silently swallowing it. After turning that off, Maddie confirmed a real system notification banner appeared.
- **Test:** Responsive two-column desktop layout + shopping list left-aligned text / right-aligned checkbox.
  **Method:** Deployed and Maddie viewed on her Mac (wide screen).
  **Result:** PASS — cards shown in two columns on the desktop screenshot she sent; shopping list items now show name-left, checkbox/delete-right as requested.
