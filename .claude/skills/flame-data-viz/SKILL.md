---
name: flame-data-viz
description: Use when any card, chart, scene annotation or assistant answer of Flame in Freefall shows data. Defines the honesty rules made visible (n, n<5, AI-extracted, not_stated, no-data, citations), unit formatting, how each chart type encodes FLEX/BASS-II data, scenario rules, qc_flag labels and the Explorer/Engineer glossary.
---

# Flame in Freefall · Datos honestos (v3)

Se juzga **Validity** tanto como **Presentation**. Reglas de fondo: `docs/03-analisis-datos.md` y skill
`nasa-data-grounding`. Esta skill dice cómo se **ve** cada regla.

## 1. Ocho reglas visibles
| # | Regla | En pantalla |
|---|---|---|
| 1 | Toda cifra tiene fuente | `SourceChip` (programa · PSI-ID → doi.org) en cada tarjeta y respuesta |
| 2 | `n` siempre visible | `n = 17` junto a cada cifra o barra |
| 3 | n<5 → advertencia | ámbar + ⚠ + "Small sample (n = 3)"; nunca un % sin su n |
| 4 | % de extinción FLEX es descriptivo | junto al %: "descriptive, not a probability" |
| 5 | BASS-II `not_stated` ≠ no se apagó | "Not stated in notes", punteado, nunca sumado a otro resultado; sin % para BASS-II |
| 6 | Lo extraído por IA se marca | badge "AI-extracted"; `low_confidence_warning` en ámbar |
| 7 | "Disruption" no está definido | tooltip fijo "Not defined in the FLEX Science Documents" |
| 8 | Sin dato se dice | estado `NoData` con frase concreta; los huecos son hallazgos |
CO₂/He están confundidos con O₂: escribir "tests with CO₂ added showed…", nunca "CO₂ reduces…". No hay predicción.

## 2. Unidades (`lib/format.ts`)
O₂ `0.222 → 22.2% O₂` · presión psi primero `0.7057 atm → 10.4 psi (0.71 atm)` (1 atm = 14.696 psi) · burning rate
`0.50 mm²/s` · diámetro `1.25 mm` · `% · descriptive` · CO₂/He `0.44% CO₂` · rangos con – · `null` → "Not recorded"
(presión BASS-II) / "Not stated in notes" (resultado BASS-II). Nunca redondear para que "coincida" con un escenario.

## 3. Cómo codifica cada tipo de vista
| Vista | Úsala para | Codificación | Obligatorio |
|---|---|---|---|
| **Ring** (fracción) | "X de Y" | arco menta = X/Y; centro icono; al lado `X/Y` + etiqueta | Y visible; ámbar si Y<5. Nunca probabilidades |
| **Big number** | una respuesta | Sora 300 + unidad + frase de lectura | n y fuente |
| **Bars** | comparar categorías (combustible, resultado, banda) | barras horizontales, color por variable (§4) | n por barra; barras con n<5 rayadas en ámbar |
| **Line** | tendencia por banda de O₂ ordenada | puntos + línea fina; un color por combustible | puntos con n<5 huecos y ⚠; no unir a través de bandas sin datos |
| **Heatmap** | cobertura O₂ × presión | intensidad = n (`--cov-*`) o burning rate (`--seq-*`); n impreso en cada celda | vacío rayado "No tests"; n<5 ámbar |
| **Radar** | cobertura compacta en una tarjeta pequeña | anillos = presión, sectores = banda de O₂ | mismas reglas que heatmap |
| **Scatter** | filas crudas (O₂ vs burning rate) | un punto por prueba, color por combustible o resultado | sin líneas de tendencia ni ajustes (serían un modelo) |
| **List** | huecos, hallazgos | ∅ + texto tal cual del JSON | DOI por hueco |
| **Table** | pruebas individuales | columnas del contrato + badges | export CSV con `source_doi` y `qc_flags` |
Todas las vistas usan solo campos existentes. Promedios nuevos → Python, no React.

## 4. Color por variable (lo que el usuario puede elegir)
El usuario elige **qué colorea** (combustible, programa o resultado), no hex libres: así el color siempre significa algo
y mantiene contraste. Paletas: `--fuel-*`, `--prog-*`, `--out-*`, `--seq-*`, `--cov-*` (`flame-design-system` §2).
Leyenda siempre visible (no solo en tooltip).

## 5. Escenarios (`scenarios.json`)
- Mostrar `n_exact` **y** `n_near` (±1% O₂, ±0.5 psi). Moon base hoy: 0 exact / 17 near (disruption 15, completion 2).
- `n_near = 0` con `nearest` → bloque ámbar "Closest tested condition — it is NOT this scenario" + rangos.
- `verified: false` → "Source pending verification". `bass2_o2_only` → fila aparte (sin presión registrada).
- Escena 3D: la llama solo usa `criteria.o2.value` y `criteria.pressure_psi.value` (más O₂ → más grande y brillante;
  más presión → borde más definido; forma siempre esfera). Medidas en la escena: del JSON o rotuladas "illustrative".
- **Coverage** (`coverage.json`): un mapa por combustible; promedios con su propio `n_*`; nota "Suppressants are mixed within each cell".
- **BASS-II** (`materials.json`): solo "Shown to burn" o "Undetermined — no stated outcome"; nunca "non-flammable";
  varillas negras y claras por separado; O₂ "measured in chamber".
- **Gaps** (`gaps.json`): texto tal cual, con evidencia y DOI.
- **Respuestas SI**: texto + `warnings` en ámbar + citas clicables; `no_data: true` tiene estilo propio y es un
  resultado válido (preguntas trampa: gravedad lunar, traje, "today's data").

## 6. Etiquetas de `qc_flags` y glosario
| Flag | Texto UI |
|---|---|
| `extinction_diameter_dropped_outcome_not_extinction` | Extinction diameter removed: outcome was not extinction |
| `co_initial_negative` | Initial CO reading below zero (kept as recorded) |
| `material_assumed_from_readme` | Material inferred from dataset README |
| `mole_fractions_do_not_sum_to_1` | Gas fractions do not add up to 100% |
| `o2_final_implausibly_low` / `_high` | Final O₂ reading looks implausible |
| `co_over_range_gt_1000ppm` | CO above sensor range (>1000 ppm) |
| `co_final_censored` | Final CO is a lower bound (>500 ppm); not imputed |
| `low_confidence` | Low-confidence AI extraction |
| `material_text_typo` | Typo in source material text |
| `date_year_inconsistent_with_gmt` | Date year disagrees with GMT day (likely year typo) |
| `duplicate_flex_id` | Duplicate test ID in source |
| `burn_time_approx` | Burn time approximate |
| `fer_corrected` | Value corrected by team data reviewer (original text kept) |
| `pressure_zero_set_null` | Pressure of 0 treated as not recorded |
Flag desconocido → mostrar el código.

Glosario (`lib/glossary.ts`, Explorer / Engineer; completar con Fer):
Microgravity — "Like falling forever: hot air doesn't rise, so the flame is a ball." / "Near-zero buoyancy; diffusion-controlled spherical flame." ·
O₂ fraction — "How much of the air is oxygen; Earth ≈21%." / "Ambient O₂ mole fraction (FLEX set, BASS-II measured)." ·
Burning rate — "How fast the fuel drop shrinks." / "Burning-rate constant K (d² law), mm²/s." ·
Extinction diameter — "Drop size when the flame went out." / "Droplet diameter at extinction, mm." ·
Disruption — "Something interrupted the test; the source doesn't define it." / "Not defined in FLEX Science Documents." ·
Blowoff — "Airflow pushed the flame off." / "Flame detachment under forced flow (BASS-II)." ·
psi — "Air pressure; Earth 14.7 psi." / "psia; 1 atm = 14.696 psi."

## 7. Checklist de honestidad
- [ ] Cada cifra con n y fuente a un clic. Ninguna cifra escrita a mano en un componente.
- [ ] n<5 siempre con ⚠. Ningún % de BASS-II. `not_stated` nunca sumado.
- [ ] Ninguna línea de tendencia ni ajuste. Vocabulario prohibido ausente (predict, risk, safe, probability…).
- [ ] Las preguntas trampa muestran "No data available" con su motivo.
- [ ] La escena dice "Illustration. Not a combustion simulation."
