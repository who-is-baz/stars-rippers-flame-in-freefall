# Frontend · Flame in Freefall

Vite + React 18 + TypeScript strict. Todo sale de `public/data/*.json` (generados por `scripts/build_frontend_data.py`):
funciona sin backend, sin red y sin Ollama.

```bash
cd frontend
npm install
npm run dev        # http://127.0.0.1:5173  (recarga cada 5 s; desactivar con /?norefresh)
npm test           # vitest: honesty.ts y lowMode.ts
npm run build      # tsc + vite build → dist/ (estático, base relativa './')
npm run preview    # sirve dist/ en http://127.0.0.1:4173
```

## Estructura
- `src/design/` tokens (flame-design-system §2) y estilos globales; fuentes autoalojadas (Michroma + Manrope).
- `src/data/` tipos, carga de los 7 JSON (`DataProvider`, `assertShape`) y hooks `useData`.
- `src/lib/` `format.ts` (unidades), `honesty.ts` (n<5, not_stated, flags, IA), `filters.ts`, `scenario.ts`, `glossary.ts`.
- `src/providers/` escenario (default `lunar_challenge`), modo Explorer/Engineer, panel SI.
- `src/views/` Overview (escena 2D + inspector + 3 tarjetas), Coverage, Explorer, Gaps, Materials.
- `src/assistant/` panel SI acoplado a la derecha; modo Low = `answers.json` por palabras clave.

## Rutas (hash)
`#/overview` · `#/explorer?program=FLEX&fuel=heptane&o2_band=>=0.24&pressure=~0.7 atm` · `#/coverage?scenario=lunar_challenge&cell=…` · `#/gaps` · `#/materials`

## Despliegue
`npm run build` y subir `dist/` a un hosting estático (GitHub Pages o Netlify Drop). Con `base: './'` funciona en cualquier subpath;
para forzar uno: `VITE_BASE=/repo/ npm run build`.
