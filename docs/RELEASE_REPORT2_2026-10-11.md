# Dashboard release — Servexa report 2 (11 Oct 2026)

The deployment record, runbook and mobile contract live in the private backend repository
(`enrgy-BE/docs/deploy/REPORT2_RELEASE_2026-10-11.md`). This note keeps only what is needed to build and roll back this repository.

* **Live before this release:** build of commit `5c6de0a` — bundle `assets/index-hTuNkOhz.js`
  (sha256 `b9017b53b6d2157dafbe39fd6e65a706343d707a85adca98807c00b40f0069d8`), css `index-CQ40vipG.css`.
  Rebuilding `5c6de0a` with `VITE_API_URL=https://backend.servexa.tech/api/` reproduces that file name exactly.
* **Deploy order:** backend first. An older backend silently ignores `branchIds` sent by the create-user dialog.
* **Build:** `npm ci && VITE_API_URL=https://backend.servexa.tech/api/ npm run build`, publish `dist/`.
  Always set `VITE_API_URL` explicitly — a local, git-ignored `.env.production` may point at a non-production API.
* **Rollback:** re-publish the previous artifact (hashes above) or rebuild `5c6de0a` as above; the dashboard is static.
* **Overrides:** `package.json` pins `@radix-ui/react-dismissable-layer` and `@radix-ui/react-focus-scope`; without them any
  Popover/Combobox inside a Dialog is unclickable (duplicate Radix copies). Do not remove.
* **Verification (local, disposable stack):** `npm ci`, `tsc -b`, build pass; vitest 58/59 and eslint 18 errors are identical to
  `5c6de0a`; headless-browser checks pass (EN desktop / AR mobile).
