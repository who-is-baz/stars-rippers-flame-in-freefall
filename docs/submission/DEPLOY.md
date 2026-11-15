# Deploy — static site, no backend, no AI model

The public site is the folder `frontend/dist` (≈1.1 MB: `index.html`, `assets/`, `data/*.json`, fonts). It uses relative
paths, so it works at a domain root and in any sub-directory. It makes **no requests to other servers**
(checked with `scripts/check_static_site.mjs` at 390 / 768 / 1280 px, at `/` and in a sub-directory).
The only external URL in the code is `http://127.0.0.1:8000`, used **only** if a visitor clicks "Connect local AI".

## Build (do NOT set `VITE_LLM_URL` or `VITE_API_URL`)
```bash
cd frontend && npm ci && npm run build          # → frontend/dist
cd dist && zip -r ../../site.zip . && cd ../..   # optional: site.zip (index.html at the zip root; not committed)
```

## Option A — Netlify Drop (fastest, no account setup beyond login)
1. Open https://app.netlify.com/drop and drag the **folder `frontend/dist`** (or unzip `site.zip` and drag that folder).
2. Open the URL Netlify gives you in a **private/incognito window**: the dashboard must load, the SI Assistant must answer
   in Basic mode, and Flash/Medium/Heavy must be disabled.
3. Paste the URL in `docs/submission/final_project_link.md` and in the form field "Link to Final Project".
4. Optional: Site configuration → Change site name, to get a readable sub-domain (e.g. `flame-in-freefall-explorer`).
5. Optional: request a FortiGuard classification (`docs/submission/FORTIGUARD.md`).

`netlify.toml` (repo root) is only for Git-based deploys: base `frontend`, command `npm run build`, publish `dist`.

## Option B — GitHub Pages (only once the repository is public)
1. Settings → Pages → Source: **GitHub Actions**.
2. Actions → workflow **pages** → Run workflow (`.github/workflows/pages.yml`, manual trigger).
3. The site appears at `https://<user>.github.io/<repo>/`. No `VITE_BASE` is needed because the build uses base `./`;
   set `VITE_BASE=/<repo>/` only if you ever switch to absolute paths.

## Not deployed by the assistant
No Netlify CLI session exists on the build machine, so nothing was published: the folder and `site.zip` are ready to drag.
The backend (`src/backend`) is for the demo laptop only and is never deployed publicly.
