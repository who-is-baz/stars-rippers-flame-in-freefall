# Deploy

**Production URL:** https://flame-in-freefall-explorer.netlify.app/ (Netlify, static site, no backend).

## Update the site (keeps the same URL)
1. Build: `cd frontend && npm ci && npm run build` → `frontend/dist/` (relative paths; works on any static host).
   Optionally zip it with `index.html` at the root of the zip: `cd frontend/dist && zip -r ../../site.zip .`
   (`site.zip` is not versioned).
2. In Netlify, open the **same** project (flame-in-freefall-explorer) → *Deploys* → drag `frontend/dist` (or
   `site.zip`) onto the **"Already built it?"** drop zone. A new project would get a different URL.
3. Check the deployed site: dark theme by default, `?theme=light`, no console errors, the assistant answers in Basic mode.

Before uploading, the gate must be green: `python -m pytest`, `cd frontend && npm test && npm run build`,
`python scripts/audit_numbers.py`, and the static-site checks in `docs/SETUP.md`.
