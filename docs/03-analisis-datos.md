# 03 · Análisis de datos (actualizado sábado 14 nov, 10:40)

> Fuente de detalle: `docs/data-dictionary.md` (sección "Limitaciones conocidas"). Este archivo es el resumen de decisiones.

## Fuente
NASA Physical Sciences Informatics (psi.nasa.gov). Descarga reproducible con `scripts/fetch_psi.py` (≥1.1 s entre peticiones, verifica SHA-256). `data/raw/` es intocable.

## Experimentos del MVP
| Experimento | ID PSI | DOI | Filas | Papel en el proyecto |
|---|---|---|---|---|
| **FLEX** (combustión de gotas, ISS) | PSI-69 | 10.60555/mbq8-0451 | 274 | **Núcleo**: O₂, presión, supresor (CO₂, He), tasa de combustión, diámetro de extinción |
| **BASS-II** (llamas en sólidos, ISS) | PSI-25 | 10.60555/4qc4-de67 | 129 | **Contexto**: materiales, espesores, O₂ medido, CO/CO₂. Resultado declarado solo en 26 filas (extraído con IA) |

Candidatas aún sin revisar: PSI-10, 100 (Saffire-III), 101, 159 (ver pendientes).

## Tabla unificada
`data/processed/experiments.csv` (403 filas) → `data/processed/psi.sqlite` (se regenera, no se sube a git).
Columnas clave: `program`, `test_id`, `material_or_fuel`, `material_category`, `o2_fraction`, `pressure_atm`, `co2_fraction`, `he_fraction`, `outcome`, `outcome_source` (observed | ai_extracted | not_stated), `extinction_diameter_mm`, `burning_rate_mm2_s`, `qc_flags`, `source_doi`.

## Reglas de interpretación (obligatorias en UI, asistente y demo)
1. **FLEX se diseñó para buscar el límite de extinción**: el "% de extinción" es *descriptivo, no una probabilidad*.
2. **CO₂ y He están confundidos con O₂** en varias celdas: no atribuir efectos a un solo factor.
3. **n < 5 → advertencia obligatoria** y celda en gris; nunca un porcentaje sin n.
4. `extinction_diameter_mm` solo cuando `outcome = extinction`.
5. En BASS-II, `not_stated` ≠ "no se extinguió". No calcular % de extinción de BASS-II.
6. O₂ y CO₂ no significan lo mismo en FLEX (fijados por el ensayo) y BASS-II (medidos en cámara).
7. "Disruption" **no está definido** por la fuente: mostrar como "no definido por la fuente".
8. Valores dudosos se **marcan** (`qc_flags`), no se corrigen en silencio. Duplicado conocido: FLEX 193F001.
9. Todo lo extraído por IA se etiqueta (`ai_*`, `extracted_by=AI`) hasta que Fer lo revise.
10. No hay modelo predictivo en el MVP (sesgo de diseño + confusión).

## Qué sí se puede afirmar (a validar por Fer antes del demo)
- A ~1 atm, la tasa de combustión sube con el O₂ (metanol ≈0.36 → 0.50 → 0.67 mm²/s para O₂ 0.12 → 0.21 → 0.30; heptano ≈0.52 → 0.56 → 0.74).
- El mapa de cobertura muestra qué combinaciones se probaron y cuáles no (49 celdas; la mayoría con n<5).

## Ranking (descriptivo, pesos ajustables)
Por condición (combustible × banda de O₂ × presión × supresor): tasa de combustión media, diámetro de extinción medio (hipótesis: menor = llama más persistente; **Fer valida**) y confianza (n). Se muestra el desglose y el n de cada fila.

## Asistente
Solo usa las funciones de `src/psi_queries.py` como herramientas (no SQL libre). Sin dato → "sin dato".

## Pendientes
- [ ] Fer aprueba `docs/material_mapping_proposal.csv` (bloquea el esquema final).
- [ ] Revisar PSI-10, 100, 101, 159 por tablas utilizables (opcional).
- [ ] Confirmar licencia de los datos en la ficha PSI antes de subir los CSV procesados.
- [ ] Confirmar con la Local Lead la hora límite de entrega.
