# YAEL v2: rangos de O₂ y presión (reemplaza mi mensaje anterior)

1. FLEX solo tiene 3 presiones: 10.18–10.53 psi (n=103), ~1 atm (n=161) y 30–45 psi (n=9, todas con CO₂). **No hay ninguna prueba a 8.2 psi ni a 4.3 psi**, y el O₂ máximo es 34 %.
2. Con la MISMA tolerancia para todos (±0.01 O₂, ±0.5 psi): Tierra = 49 (29 sin supresor) ✔ Fer. El "lunar ≥30 % y ≤10.2 psi" da **17, no 0** (9 metanol + 8 heptano, 15 disruption + 2 completion). 26.5 %, 34 %/8.2 psi y traje = 0 pruebas; solo hay vecinos cercanos.
3. Charly: sus 8 filas cuadran, pero sus bandas están cerradas a la derecha (el aire 0.21 cae con 0.16–0.20) y la tasa media mezcla presiones y CO₂/He. Le dejé una versión estratificada en `charly_conciliacion.csv`.
4. PDF de materiales: BASS-II cuadra; FLEX no (160/114 vs 157/117 del CSV, lunar 19 vs 17, 30 %·1 atm tiene 2 extinciones y no 1). Hay que preguntar al autor de dónde sacó sus cifras.
5. Decidir hoy: bandas (recomiendo B: partir ≥0.24 en 0.28, parche listo sin aplicar), tolerancia (recomiendo ±0.01/±0.5 psi) y definición lunar (recomiendo 26.5 %/10.2 y 34 %/8.2 de NASA, mostrando "sin datos + vecino más cercano"). Detalle: `docs/analisis/rangos-o2-presion/informe.md`.
