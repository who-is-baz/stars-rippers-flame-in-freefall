#!/usr/bin/env python3
"""Genera data/processed/coverage_grid.json: cobertura de FLEX por combustible × banda de O2 × presión × supresor.

Uso: python3 scripts/build_coverage_grid.py   (después de scripts/build_experiments.py)
"""
import datetime, json, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import psi_queries as q  # noqa: E402

OUT = "data/processed/coverage_grid.json"

con = q.connect()
cells = q.flex_coverage_grid(con)  # mismos nombres de campo que devuelve la API (docs/API.md)

doc = {
    "description": "FLEX (NASA PSI PSI-69): cobertura de pruebas por combustible × banda de O2 × presión × supresor",
    "source_doi": "10.60555/mbq8-0451",
    "license": "CC0-1.0",
    "generated_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "generated_by": "scripts/build_coverage_grid.py (src/psi_queries.py:flex_coverage_grid)",
    "pct_extinction_note": (
        f"{q.PCT_NOTE}: FLEX chose test conditions iteratively to approach the extinction limit "
        "(FLEX Test Plan, PDF p.4). The percentage describes the tests performed, not a risk."),
    "min_n_for_stable_pct": q.MIN_N,
    "dimensions": {
        "fuel": ["heptane", "methanol"],
        "o2_band": [{"label": l, "min_inclusive": lo, "max_exclusive": hi} for lo, hi, l in q.O2_BANDS],
        "pressure_atm_level": "presión redondeada a 0.1 atm; 'unknown' = presión nula (C11M201 tenía 0.0)",
        "suppressant": "none | co2 | he (CO2 y He nunca aparecen juntos); ver suppressant_fraction_min/max",
    },
    "fields": {
        "n": "pruebas en la celda",
        "avg_burning_rate_mm2_s": "media de K (ley d²) en mm²/s sobre n_burning_rate pruebas con K",
        "avg_extinction_diameter_mm": "media del diámetro de extinción solo en pruebas con outcome = extinction (n_extinction_diameter)",
        "pct_extinction": "100 × n_extinction / n; siempre con pct_note (descriptivo, no probabilidad)",
        "warning": f"presente si n < {q.MIN_N}",
        "qc_flags": "flags de calidad presentes en la celda (ver docs/data-dictionary.md)",
    },
    "n_cells": len(cells),
    "n_cells_small": sum(c["n"] < q.MIN_N for c in cells),
    "n_tests": sum(c["n"] for c in cells),
    "cells": cells,
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)
print(f"{OUT}: {doc['n_cells']} celdas ({doc['n_cells_small']} con n<{q.MIN_N}), {doc['n_tests']} pruebas")
