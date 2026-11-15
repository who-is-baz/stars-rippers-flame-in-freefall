# Flarefall · frontend

React 18 + TypeScript site built with Vite. It reads only the static files in `public/data/*.json` (no server needed).

```bash
npm ci
npm run dev       # http://127.0.0.1:5173   (?intro=off skips the opening animation)
npm test          # Vitest
npm run build     # type-check + static build in dist/ (relative paths: works under any sub-path)
npm run preview   # serves dist/ at http://127.0.0.1:4173
```

Optional: `VITE_LLM_URL` or `VITE_API_URL` point the SI assistant to the local FastAPI backend (see `../docs/SETUP.md`);
without them the assistant runs in Basic mode with precomputed, cited answers.
