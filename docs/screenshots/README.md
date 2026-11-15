# Capturas del explorador "Custom" (Overview)

Generadas con `scripts/capture_explorer.mjs` (playwright-core + Chrome del sistema, 1600×1000, `reducedMotion: reduce`).
Valores de cada estado, encontrados en `experiments.json` (mismos que `STATES` en `AtmosphereExplorer.test.tsx`):

| Archivo | Ajustes | Resultado observado |
|---|---|---|
| `explorer-stable.png` | ambos combustibles, 34 % O₂, 10.3 psi | 9 pruebas, 0 extinción (8 disruption, 1 completion) |
| `explorer-mixed.png` | ambos, 20 % O₂, 14.6 psi | 56 pruebas, 34 extinción → "mixed outcomes" |
| `explorer-out.png` | metanol, 14 % O₂, 14.6 psi | 25 de 25 extinción → estado apagado |
| `explorer-small_n.png` | ambos, 15 % O₂, 10.3 psi | n = 4 (4 de 4 extinción) → gris, aviso n < 5, sin estado apagado |
| `explorer-empty.png` | ambos, 27 % O₂, 20 psi | 0 pruebas → trama, sin cifras, 3 condiciones probadas más cercanas |
