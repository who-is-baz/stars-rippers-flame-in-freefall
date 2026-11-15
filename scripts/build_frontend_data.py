#!/usr/bin/env python3
"""Genera los JSON estáticos que consume el frontend: frontend/public/data/*.json.

Uso: python3 scripts/build_frontend_data.py   (después de scripts/build_experiments.py)

Lee data/processed/ (psi.sqlite a través de src/psi_queries.py y src/scenarios.py, sin SQL propio; y
bass2_tests.csv para el color de las varillas). No lee ni escribe data/raw/.
Todos los números se calculan aquí; los textos van en inglés (la UI y la entrega son en inglés).
Si falta un dato, el número queda null y el registro lleva "status": "no data". Nunca se imputa.
Solo meta.json cambia entre corridas (generated_utc); el resto es determinista.
"""
from __future__ import annotations

import csv
import datetime
import json
import os
import sys
from collections import Counter
from statistics import mean

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.join(ROOT, "src"))
import psi_queries as q  # noqa: E402
import relevance as rel  # noqa: E402
import scenarios as sc  # noqa: E402

OUT = os.path.join(ROOT, "frontend", "public", "data")
BASS_CSV = os.path.join(ROOT, "data", "processed", "bass2_tests.csv")
DOI = {"FLEX": "10.60555/mbq8-0451", "BASS-II": "10.60555/4qc4-de67"}
FUELS = ("heptane", "methanol")
NO_DATA = "no data"
STATED = ("extinction", "blowoff", "not_sustained")  # resultados que implican que hubo llama

LIMITATIONS = [
    "All tests were run in microgravity on the ISS; there is no partial-gravity (Moon or Mars) combustion data in PSI.",
    "FLEX extinction percentages are descriptive, not probabilities: tests were chosen iteratively to approach the extinction limit.",
    "Cells with n < 5 always carry a warning.",
    "CO2 and He effects are confounded with O2 (average O2 differs between suppressant levels); no causal claims.",
    "'Disruption' is not defined in the FLEX Science Documents.",
    "BASS-II outcomes were extracted by AI from free-text notes; 'not_stated' does not mean the flame did not go out.",
    "BASS-II has no recorded pressure and its O2 was measured, not set by design.",
]


def r3(x):
    return None if x is None else round(x, 3)


def avg(vals):
    vals = [v for v in vals if v is not None]
    return r3(mean(vals)) if vals else None


def flags_of(rows):
    return sorted({f for r in rows for f in r["qc_flags"]})


def pct_fields(n_hit, n):
    return {"pct_extinction": round(100.0 * n_hit / n, 1), "pct_note": q.PCT_NOTE,
            "warning": q.SMALL_N_WARNING.format(min_n=q.MIN_N) if n < q.MIN_N else None}


def write(name, obj):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return path


# --------------------------------------------------------------------------- datos base
def load(con):
    rows = q.list_experiments(con, limit=q.MAX_LIMIT)
    assert rows["total"] == len(rows["items"]), "hay más filas que MAX_LIMIT: paginar"
    items = rows["items"]
    for r in items:
        r["_psi"] = sc.psi(r["pressure_atm"])
        r["_band"] = sc.o2_band(r["o2_fraction"])
        r["_level"] = sc.pressure_level(r["pressure_atm"])
        r["_supp"] = ("co2" if (r["co2_fraction"] or 0) > 0 else "he" if (r["he_fraction"] or 0) > 0 else "none")
    return items


def public(r):
    return {k: v for k, v in r.items() if not k.startswith("_")}


# --------------------------------------------------------------------------- archivos
def build_meta(items, excluded):
    by_prog = Counter(r["program"] for r in items)
    return {
        "title": "Flame in Freefall: NASA PSI microgravity combustion data (FLEX + BASS-II)",
        "generated_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "generated_by": "scripts/build_frontend_data.py",
        "license": "CC0-1.0",
        "n_tests": len(items),
        "programs": [
            {"program": "FLEX", "psi_id": "PSI-69", "n": by_prog["FLEX"], "source_doi": DOI["FLEX"],
             "what": "fuel droplets (heptane, methanol)"},
            {"program": "BASS-II", "psi_id": "PSI-25", "n": by_prog["BASS-II"], "source_doi": DOI["BASS-II"],
             "what": "solid materials in airflow"},
        ],
        "source_doi": [DOI["FLEX"], DOI["BASS-II"]],
        "tolerance": sc.TOLERANCE,
        "o2_bands": [{"label": l, "min_inclusive": lo, "max_exclusive": hi} for lo, hi, l in sc.O2_BANDS],
        "pressure_levels": list(sc.PRESSURE_LEVELS),
        "min_n": q.MIN_N,
        "excluded_from_pressure_views": excluded,
        "limitations": LIMITATIONS,
        "files": {
            "scenarios.json": "atmosphere scenarios with n_exact / n_near",
            "coverage.json": "FLEX grid: fuel x O2 band x pressure level",
            "experiments.json": "all tests, one row each (API contract columns)",
            "gaps.json": "what the data does not cover",
            "materials.json": "BASS-II by material category",
            "answers.json": "suggested questions with precomputed answers (assistant 'low' mode)",
            "airflow.json": "BASS-II initial air speed (cm/s), read from notes by AI; used by the scene's airflow indicator",
        },
    }


def build_scenarios(con):
    out = []
    for r in sc.evaluate_all(con):
        out.append({
            "id": r["id"], "label": r["label"], "criteria": r["criteria"],
            "n_exact": r["n_exact"], "n_near": r["n_near"],
            "status": "ok" if r["n_near"] else NO_DATA,
            "exact": r["exact"], "near": r["near"], "nearest": r["nearest"],
            "bass2_o2_only": r["bass2_o2_only"],
            "source": r["source"], "quote": r["quote"], "verified": r["verified"], "note": r["note"],
            "excluded": r["excluded"], "source_doi": DOI["FLEX"],
        })
    return {"program": "FLEX", "tolerance": sc.TOLERANCE, "scenarios": out}


def build_coverage(items):
    flex = [r for r in items if r["program"] == "FLEX" and r["_level"] is not None]
    cells = []
    for fuel in FUELS:
        for _, _, band in sc.O2_BANDS:
            for lv in sc.PRESSURE_LEVELS:
                rows = [r for r in flex if r["material_or_fuel"] == fuel and r["_band"] == band
                        and r["_level"] == lv["label"]]
                n = len(rows)
                ext = [r for r in rows if r["outcome"] == "extinction"]
                cell = {
                    "fuel": fuel, "o2_band": band, "pressure_level": lv["label"], "n": n,
                    "status": "ok" if n else NO_DATA,
                    "n_by_suppressant": {k: sum(r["_supp"] == k for r in rows) for k in ("none", "co2", "he")},
                    "n_burning_rate": sum(r["burning_rate_mm2_s"] is not None for r in rows),
                    "avg_burning_rate_mm2_s": avg(r["burning_rate_mm2_s"] for r in rows),
                    "n_extinction": len(ext),
                    "n_extinction_diameter": sum(r["extinction_diameter_mm"] is not None for r in ext),
                    "avg_extinction_diameter_mm": avg(r["extinction_diameter_mm"] for r in ext),
                    "pct_extinction": None, "pct_note": None, "warning": None,
                    "qc_flags": flags_of(rows),
                    "source_doi": [DOI["FLEX"]] if n else [],
                }
                if n:
                    cell.update(pct_fields(len(ext), n))
                cells.append(cell)
    return {
        "program": "FLEX",
        "note": ("Suppressants are mixed within each cell (see n_by_suppressant); averages are descriptive. "
                 "Per-suppressant cells: data/processed/coverage_grid.json."),
        "n_tests": sum(c["n"] for c in cells),
        "n_cells": len(cells), "n_cells_empty": sum(c["n"] == 0 for c in cells),
        "n_cells_small": sum(0 < c["n"] < q.MIN_N for c in cells),
        "cells": cells,
    }


def build_experiments(items):
    cols = [c for c in items[0] if not c.startswith("_")]
    return {"columns": cols, "total": len(items), "items": [public(r) for r in items]}


def build_gaps(items, coverage, scen):
    flex = [r for r in items if r["program"] == "FLEX"]
    p = [r for r in flex if r["_psi"] is not None]
    min_psi, max_psi = min(r["_psi"] for r in p), max(r["_psi"] for r in p)
    o2s = sorted({round(r["o2_fraction"], 2) for r in flex})
    gap_lo, gap_hi = max(zip(o2s, o2s[1:]), key=lambda ab: ab[1] - ab[0])
    high = [c for c in coverage["cells"] if c["pressure_level"] == ">2 atm" and c["n"] > 0]
    hp = [r for r in p if r["pressure_atm"] > 1.5]
    hp_by_p = Counter(round(r["pressure_atm"], 1) for r in hp)
    empty = [c for c in coverage["cells"] if c["n"] == 0]
    bass = [r for r in items if r["program"] == "BASS-II"]
    not_stated = sum(r["outcome_source"] == "not_stated" for r in bass)
    no_scen = [s for s in scen["scenarios"] if s["n_exact"] == 0]
    gaps = [
        {"id": "low_pressure", "source_doi": [DOI["FLEX"]],
         "text": f"No FLEX test below {min_psi:.2f} psi ({min_psi / sc.PSI_PER_ATM:.2f} atm): no data at 8.2 psi or 4.3 psi.",
         "evidence": {"min_psi": round(min_psi, 2), "max_psi": round(max_psi, 2), "n_with_pressure": len(p)}},
        {"id": "high_oxygen", "source_doi": [DOI["FLEX"], DOI["BASS-II"]],
         "text": f"No test above {max(o2s):.0%} O2 (FLEX max {max(o2s):.2f}; BASS-II max "
                 f"{max(r['o2_fraction'] for r in bass):.3f}).",
         "evidence": {"flex_o2_max": max(o2s), "bass2_o2_max": max(r["o2_fraction"] for r in bass)}},
        {"id": "oxygen_gap", "source_doi": [DOI["FLEX"]],
         "text": f"No FLEX test between {gap_lo:.0%} and {gap_hi:.0%} O2.",
         "evidence": {"o2_below": gap_lo, "o2_above": gap_hi}},
        {"id": "high_pressure_small_n", "source_doi": [DOI["FLEX"]],
         "text": (f"Above 1 atm there are only {len(hp)} FLEX tests, all in O2 band(s) "
                  f"{', '.join(sorted({r['_band'] for r in hp}))} and with suppressant(s) "
                  f"{', '.join(sorted({r['_supp'] for r in hp}))}; at each actual pressure "
                  f"({', '.join(f'{k} atm' for k in sorted(hp_by_p))}) "
                  + ("n < 5." if max(hp_by_p.values()) < q.MIN_N else "some pressures reach n >= 5.")),
         "evidence": {"n_tests": len(hp),
                      "n_by_fuel": dict(sorted(Counter(r["material_or_fuel"] for r in hp).items())),
                      "n_by_pressure_atm": {str(k): v for k, v in sorted(hp_by_p.items())},
                      "cells": [{k: c[k] for k in ("fuel", "o2_band", "pressure_level", "n")} for c in high]}},
        {"id": "empty_cells", "source_doi": [DOI["FLEX"]],
         "text": f"{len(empty)} of {len(coverage['cells'])} fuel x O2 band x pressure level cells have no tests.",
         "evidence": {"cells": [{k: c[k] for k in ("fuel", "o2_band", "pressure_level")} for c in empty]}},
        {"id": "scenarios_without_tests", "source_doi": [DOI["FLEX"]],
         "text": "No FLEX test matches these scenarios exactly: " + ", ".join(s["label"] for s in no_scen) + ".",
         "evidence": {"scenarios": [{"id": s["id"], "n_exact": s["n_exact"], "n_near": s["n_near"]} for s in no_scen]}},
        {"id": "bass2_pressure_and_outcome", "source_doi": [DOI["BASS-II"]],
         "text": f"BASS-II has no recorded pressure, and {not_stated} of {len(bass)} tests have no stated outcome "
                 "(not_stated does not mean the flame did not go out).",
         "evidence": {"n_tests": len(bass), "n_not_stated": not_stated}},
        {"id": "partial_gravity", "source_doi": [],
         "text": "There is no partial-gravity combustion data in PSI: every test here is microgravity on the ISS.",
         "evidence": {"source": "Official challenge text (docs/08-reto-oficial.md): \"there is currently no "
                                "partial-gravity combustion data available in PSI.\""}},
    ]
    return {"gaps": gaps}


def build_materials(items):
    bass = [r for r in items if r["program"] == "BASS-II"]
    with open(BASS_CSV, newline="", encoding="utf-8") as f:
        color = {r["test_id"]: r["color"] or None for r in csv.DictReader(f)}
    missing = [r["test_id"] for r in bass if not r["material_category"]]
    assert not missing, f"material_category vacío (¿falta unir docs/material_mapping.csv?): {missing[:5]}"

    def summarize(rows, **key):
        outc = Counter(r["outcome"] for r in rows if r["outcome"])
        flame = sum(outc[k] for k in STATED)
        return {
            **key, "n": len(rows),
            "n_with_outcome": sum(r["outcome_source"] != "not_stated" for r in rows),
            "n_not_stated": sum(r["outcome_source"] == "not_stated" for r in rows),
            "n_by_outcome": dict(sorted(outc.items())),
            "n_low_confidence": sum("low_confidence" in r["qc_flags"] for r in rows),
            "o2_min": min(r["o2_fraction"] for r in rows), "o2_max": max(r["o2_fraction"] for r in rows),
            "classification": "flammable_demonstrated" if flame else "undetermined",
            "warning": f"n<{q.MIN_N}: small sample" if len(rows) < q.MIN_N else None,
            "qc_flags": flags_of(rows),
            "test_ids": sorted(r["test_id"] for r in rows),
        }

    cats = sorted({r["material_category"] for r in bass})
    out = []
    for c in cats:
        rows = [r for r in bass if r["material_category"] == c]
        entry = summarize(rows, material_category=c)
        colors = sorted({color[r["test_id"]] for r in rows if color.get(r["test_id"])})
        if colors:
            entry["by_color"] = [summarize([r for r in rows if color.get(r["test_id"]) == col], color=col)
                                 for col in colors]
        out.append(entry)
    out.sort(key=lambda e: -e["n"])
    return {
        "program": "BASS-II", "source_doi": DOI["BASS-II"], "n_tests": len(bass),
        "classification_rule": {
            "flammable_demonstrated": "at least one test with a stated outcome that implies a flame "
                                      "(extinction, blowoff or not_sustained)",
            "undetermined": "no stated outcome in any test of the category (all not_stated)",
            "non_flammable": "none: no category qualifies; these data cannot show that a material does not burn",
        },
        "non_flammable": [],
        "notes": [
            "Outcomes were extracted by AI from free-text notes (outcome_source = ai_extracted).",
            "Do not average black and clear PMMA rods together: black PMMA absorbs radiation differently (see by_color).",
            "No extinction percentage is reported for BASS-II.",
        ],
        "materials": out,
    }


def build_airflow():
    """BASS-II air speed per test (bass2_tests.csv: ai_initial_air_speed_cm_s). It is AI-extracted from free-text notes and is
    only shown with that label; FLEX has no airflow variable. Tests without a value are simply absent (never imputed)."""
    with open(BASS_CSV, newline="", encoding="utf-8") as f:
        items = [{"test_id": r["test_id"], "air_speed_cm_s": float(r["ai_initial_air_speed_cm_s"])}
                 for r in csv.DictReader(f) if r["ai_initial_air_speed_cm_s"] not in ("", None)]
    return {"program": "BASS-II", "source_doi": DOI["BASS-II"], "field": "ai_initial_air_speed_cm_s", "unit": "cm/s",
            "extracted_by": "AI", "note": "Initial air speed read from free-text notes by AI; pending human review.",
            "n_tests": len(items), "items": items}


def build_answers(items, scen, coverage, materials, gaps):
    S = {s["id"]: s for s in scen["scenarios"]}
    flex = [r for r in items if r["program"] == "FLEX"]
    bass = [r for r in items if r["program"] == "BASS-II"]
    G = {g["id"]: g for g in gaps["gaps"]}
    A = []

    def add(question, answer, citations, no_data=False, warnings=None):
        A.append({"id": f"q{len(A) + 1:02d}", "question": question, "answer": answer, "citations": citations,
                  "no_data": no_data, "warnings": warnings or [], "level": "low"})

    def scen_cite(sid, test_ids):
        return [{"query": f"scenarios.{sid}", "params": {"tolerance": sc.TOLERANCE}, "source_doi": DOI["FLEX"],
                 "test_ids": test_ids}]

    # 1
    add("How many experiments does this dashboard cover?",
        f"{len(items)} tests from NASA PSI: {len(flex)} FLEX fuel-droplet tests (heptane and methanol) and "
        f"{len(bass)} BASS-II solid-material tests, all run in microgravity on the ISS.",
        [{"query": "meta", "params": {}, "source_doi": DOI["FLEX"], "test_ids": []},
         {"query": "meta", "params": {}, "source_doi": DOI["BASS-II"], "test_ids": []}])
    # 2
    e = S["earth_iss"]
    add("Which tests match Earth / ISS cabin air (21% O2, 14.7 psi)?",
        f"{e['n_exact']} FLEX tests within ±1% O2 and ±0.5 psi of 21% / 14.7 psi "
        f"({', '.join(f'{v} {k}' for k, v in e['near']['n_by_fuel'].items())}). "
        f"BASS-II has no recorded pressure; {e['bass2_o2_only']['n']} BASS-II tests match by O2 only.",
        scen_cite("earth_iss", e["exact"]["test_ids"]))
    # 3
    l = S["lunar_challenge"]
    n = l["near"]
    add("Are there tests at the expected Moon-base air (30% O2 or more, 10.2 psi or less)?",
        f"None exactly ({l['n_exact']}). With the tolerance (±0.5 psi) there are {l['n_near']} FLEX tests at "
        f"{n['psi_min']}-{n['psi_max']} psi and {n['o2_min']:.0%}-{n['o2_max']:.0%} O2; outcomes: "
        f"{', '.join(f'{k} {v}' for k, v in n['n_by_outcome'].items())}. "
        "The 30% / 10.2 psi figure is the challenge statement's estimate, not a NASA specification.",
        scen_cite("lunar_challenge", n["test_ids"]))
    # 4
    x = S["exploration"]
    nn = x["nearest"]
    add("Is there data for NASA's Exploration Atmosphere (8.2 psia, 34% O2)?",
        f"No data: no FLEX test is near 8.2 psi (the lowest is {G['low_pressure']['evidence']['min_psi']} psi). "
        f"The closest tested condition is {nn['o2_min']:.0%} O2 at {nn['psi_min']}-{nn['psi_max']} psi "
        f"(n = {nn['n']}), which is not the Exploration Atmosphere.",
        scen_cite("exploration", nn["test_ids"]), no_data=True)
    # 5
    add("Is there data for spacesuit conditions (100% O2, 4.3 psi)?",
        f"No data: the highest O2 tested is {G['high_oxygen']['evidence']['flex_o2_max']:.0%} and the lowest pressure "
        f"is {G['low_pressure']['evidence']['min_psi']} psi.",
        scen_cite("suit", []), no_data=True)
    # 6
    lines, faster = [], []
    for _, _, band in sc.O2_BANDS:
        k = {}
        for fuel in FUELS:
            rows = [r for r in flex if r["material_or_fuel"] == fuel and r["_band"] == band]
            k[fuel] = (avg(r["burning_rate_mm2_s"] for r in rows), sum(r["burning_rate_mm2_s"] is not None for r in rows))
        if k["heptane"][0] is not None and k["methanol"][0] is not None:
            faster.append(k["heptane"][0] > k["methanol"][0])
        lines.append(f"O2 {band}: heptane {k['heptane'][0]} mm2/s (n={k['heptane'][1]}), "
                     f"methanol {k['methanol'][0]} mm2/s (n={k['methanol'][1]})")
    lead = ("Heptane has the higher mean burning rate in every O2 band" if faster and all(faster)
            else "Neither fuel has the higher mean burning rate in every O2 band")
    add("Which fuel burns faster, heptane or methanol?",
        f"{lead} (descriptive; pressures and suppressants mixed). " + "; ".join(lines) + ".",
        [{"query": "q4_burning_rate_by_o2", "params": {"pressure_range": None, "suppressant": "any"},
          "source_doi": DOI["FLEX"], "test_ids": []}])
    # 7
    d = Counter(r["outcome"] for r in flex)
    add("What does 'disruption' mean in FLEX?",
        f"It is not defined in the FLEX Science Documents. {d['disruption']} of {len(flex)} FLEX tests ended in "
        "'disruption'; we do not interpret it further.",
        [{"query": "meta", "params": {}, "source_doi": DOI["FLEX"], "test_ids": []}])
    # 8
    parts = []
    for supp in ("none", "co2", "he"):
        rows = [r for r in flex if r["_supp"] == supp]
        ext = sum(r["outcome"] == "extinction" for r in rows)
        o2m = avg(r["o2_fraction"] for r in rows)
        parts.append(f"{supp}: {ext}/{len(rows)} ended in extinction ({100 * ext / len(rows):.1f}%), mean O2 {o2m}")
    add("Do CO2 or helium put out flames?",
        "These data cannot show a causal effect: CO2 and He are confounded with O2 and FLEX chose conditions "
        "iteratively. Descriptive counts: " + "; ".join(parts) + ".",
        [{"query": "q2_co2_effect", "params": {}, "source_doi": DOI["FLEX"], "test_ids": []},
         {"query": "q3_he_effect", "params": {}, "source_doi": DOI["FLEX"], "test_ids": []}],
        warnings=[q.PCT_NOTE])
    # 9
    dem = [m for m in materials["materials"] if m["classification"] == "flammable_demonstrated"]
    und = [m for m in materials["materials"] if m["classification"] == "undetermined"]
    add("Which BASS-II materials were shown to burn?",
        "Flame shown in at least one test: " + ", ".join(f"{m['material_category']} (n={m['n']}, "
        f"{m['n_with_outcome']} with outcome)" for m in dem) + ". Undetermined (no stated outcome): "
        + ", ".join(f"{m['material_category']} (n={m['n']})" for m in und)
        + ". No material can be called non-flammable from these data.",
        [{"query": "q6_bass2_outcomes_by_o2_band", "params": {}, "source_doi": DOI["BASS-II"], "test_ids": []}],
        warnings=["Outcomes were extracted by AI; not_stated does not mean the flame did not go out."])
    # 10
    add("What happens to a fire in lunar gravity?",
        "No data available for that question: every test here is in microgravity, and PSI has no partial-gravity "
        "combustion data yet. ACME's E-FIELD Flames only mimicked partial gravity with an electric field; it is an "
        "analog, not lunar data.",
        [], no_data=True)
    # 11: most relevant tests for a scenario, with the same order as the Experiments view (src/relevance.py)
    o2c, pc = rel.scenario_criteria("lunar_nasa")
    rk = rel.rank(items, o2c, pc)
    cnt = rel.counts(rk)
    top = rk[:5]
    one = lambda x: f"{x['row']['test_id']} ({x['row']['material_or_fuel'] if x['row']['program'] == 'FLEX' else x['row']['material_category']}, ΔO2 {x['d_o2'] * 100 + 0.0:+.1f} pp, " + (f"Δpsi {x['d_psi'] + 0.0:+.2f}" if x["d_psi"] is not None else "no pressure recorded") + ")"
    lead = (f"{cnt['exact']} exact and {cnt['near']} near FLEX tests for NASA lunar surface habitat (nominal): " if cnt["exact"] + cnt["near"] > 0
            else "No test is exact or near NASA lunar surface habitat (nominal). The closest by distance of conditions (not this scenario) are ")
    ids = [x["row"]["test_id"] for x in top]
    add("Which tests are most relevant to the lunar habitat scenario?",
        lead + "; ".join(one(x) for x in top) + ". Ordered by closeness of conditions, not a safety ranking. The source of this scenario is unverified.",
        [{"query": "most_relevant_tests", "params": {"scenario_id": "lunar_nasa", "limit": 5}, "source_doi": DOI["FLEX"], "test_ids": ids}],
        warnings=["Unverified source: the O2 and pressure values of this scenario are not confirmed yet."])
    # 12: what the data cannot settle, computed for the five reference atmospheres
    no_exact = sum(1 for sx in scen["scenarios"] if sx["n_exact"] == 0)
    no_near = sum(1 for sx in scen["scenarios"] if sx["n_near"] == 0)
    not_stated = sum(r["outcome_source"] == "not_stated" for r in bass)
    add("What can't the data tell us about this atmosphere?",
        f"For any atmosphere: all {len(items)} tests are microgravity on the ISS; samples are not habitat materials; CO2 and He are confounded with O2; "
        f"{not_stated} of {len(bass)} BASS-II outcomes are not stated. {no_exact} of {len(scen['scenarios'])} reference atmospheres have no exact test and {no_near} have no test within tolerance. "
        "Select an atmosphere and read \"What remains unresolved\" for its own list.",
        [{"query": "scenarios", "params": {}, "source_doi": DOI["FLEX"], "test_ids": []},
         {"query": "scenarios", "params": {}, "source_doi": DOI["BASS-II"], "test_ids": []}])
    return {"level": "low", "note": "Precomputed by scripts/build_frontend_data.py; numbers come from the data files.",
            "answers": A}


def main():
    os.makedirs(OUT, exist_ok=True)
    con = q.connect()
    items = load(con)
    excluded = [{"test_id": r["test_id"], "program": r["program"], "reason": "no pressure recorded"}
                for r in items if r["program"] == "FLEX" and r["pressure_atm"] is None]
    scen = build_scenarios(con)
    coverage = build_coverage(items)
    materials = build_materials(items)
    gaps = build_gaps(items, coverage, scen)
    files = {
        "meta.json": build_meta(items, excluded),
        "scenarios.json": scen,
        "coverage.json": coverage,
        "experiments.json": build_experiments(items),
        "gaps.json": gaps,
        "materials.json": materials,
        "answers.json": build_answers(items, scen, coverage, materials, gaps),
        "airflow.json": build_airflow(),
    }
    for name, obj in files.items():
        path = write(name, obj)
        print(f"{os.path.relpath(path, ROOT)}: {os.path.getsize(path):,} bytes")


if __name__ == "__main__":
    main()
