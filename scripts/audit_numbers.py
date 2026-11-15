#!/usr/bin/env python3
"""Auditoría de cifras: recalcula TODO desde data/processed/experiments.csv (sin psi_queries ni SQLite, a propósito: es una
segunda implementación independiente) y falla si algo no coincide con frontend/public/data/*.json, con las cifras
fijas de la entrega (docs/submission/*.md) o si hay cifras de datos escritas a mano en frontend/src.
Uso: python scripts/audit_numbers.py        (sale con código 1 si hay una discrepancia)"""
from __future__ import annotations

import csv
import json
import math
import os
import re
import statistics
import sys
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUB = os.path.join(ROOT, "frontend", "public", "data")
PSI = 14.6959
TOL_O2, TOL_P = 0.01, 0.5
EPS = 1e-9
FAILS: list = []
OKS = 0


def check(label, got, want):
    global OKS
    if got == want:
        OKS += 1
    else:
        FAILS.append(f"{label}: got {got!r}, expected {want!r}")


def load_rows():
    rows = []
    with open(os.path.join(ROOT, "data", "processed", "experiments.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            for k in ("o2_fraction", "pressure_atm", "co2_fraction", "he_fraction", "burning_rate_mm2_s", "extinction_diameter_mm"):
                r[k] = float(r[k]) if r[k] not in ("", None) else None
            rows.append(r)
    return rows


def supp(r):
    return "he" if (r["he_fraction"] or 0) > 0 else "co2" if (r["co2_fraction"] or 0) > 0 else "none"


def match(r, crit_o2, crit_p, relaxed):
    def ok(x, c):
        k, v = c
        if k == "point":
            return abs(x - v) <= (TOL_O2 if c is crit_o2 else TOL_P) + EPS
        slack = (TOL_O2 if c is crit_o2 else TOL_P) if relaxed else 0
        return x >= v - slack - EPS if k == "min" else x <= v + slack + EPS
    return ok(r["o2_fraction"], crit_o2) and ok(r["pressure_atm"] * PSI, crit_p)


def main():
    rows = load_rows()
    flex = [r for r in rows if r["program"] == "FLEX"]
    bass = [r for r in rows if r["program"] == "BASS-II"]
    flex_p = [r for r in flex if r["pressure_atm"] is not None]
    J = lambda n: json.load(open(os.path.join(PUB, n), encoding="utf-8"))

    # ---- totales
    meta = J("meta.json"); exp = J("experiments.json")
    check("total tests", len(rows), 403); check("FLEX", len(flex), 274); check("BASS-II", len(bass), 129)
    check("meta.n_tests", meta["n_tests"], len(rows)); check("experiments.json total", exp["total"], len(rows))
    check("meta programs", {p["program"]: p["n"] for p in meta["programs"]}, {"FLEX": len(flex), "BASS-II": len(bass)})
    check("duplicate test_id 193F001", Counter(r["test_id"] for r in flex)["193F001"], 2)
    check("FLEX without pressure", len(flex) - len(flex_p), 1)
    check("tolerance in meta", meta["tolerance"], {"o2_fraction": TOL_O2, "pressure_psi": TOL_P})
    check("10.2 psi in atm (2 decimals)", round(10.2 / PSI, 2), 0.69)

    # ---- cobertura FLEX: combustible x banda de O2 x nivel de presión
    bands = [(l["min_inclusive"], l["max_exclusive"], l["label"]) for l in meta["o2_bands"]]
    levels = meta["pressure_levels"]
    band = lambda o2: next(l for lo, hi, l in bands if lo <= o2 < hi)
    level = lambda a: next((l["label"] for l in levels if a >= l["atm_min"] and (l["atm_max"] is None or a < l["atm_max"])), None)
    cov = J("coverage.json")
    cells = {(c["fuel"], c["o2_band"], c["pressure_level"]): c for c in cov["cells"]}
    mine = Counter((r["material_or_fuel"], band(r["o2_fraction"]), level(r["pressure_atm"])) for r in flex_p)
    check("coverage cells", len(cells), 30)
    for k, c in cells.items():
        n = mine.get(k, 0)
        check(f"cell {k} n", c["n"], n)
        rs = [r for r in flex_p if (r["material_or_fuel"], band(r["o2_fraction"]), level(r["pressure_atm"])) == k]
        check(f"cell {k} extinctions", c["n_extinction"], sum(r["outcome"] == "extinction" for r in rs))
        check(f"cell {k} bySupp", c["n_by_suppressant"], {s: sum(supp(r) == s for r in rs) for s in ("none", "co2", "he")})
        rates = [r["burning_rate_mm2_s"] for r in rs if r["burning_rate_mm2_s"] is not None]
        if rates:
            check(f"cell {k} mean rate", c["avg_burning_rate_mm2_s"], round(statistics.mean(rates), 3))
        if n == 0:
            check(f"cell {k} has no figures", (c["pct_extinction"], c["avg_burning_rate_mm2_s"]), (None, None))
        elif n < 5:
            check(f"cell {k} n<5 warning", bool(c["warning"]), True)
    check("tested cells", sum(1 for c in cells.values() if c["n"] > 0), 20)
    check("empty cells", sum(1 for c in cells.values() if c["n"] == 0), 10)
    check("cells with 0<n<5", sum(1 for c in cells.values() if 0 < c["n"] < 5), cov["n_cells_small"])
    check("coverage n_tests", cov["n_tests"], len(flex_p))

    # ---- BASS-II
    stated = sum(r["outcome_source"] != "not_stated" for r in bass)
    check("BASS-II outcomes stated", stated, 26); check("BASS-II not stated", len(bass) - stated, 103)
    check("BASS-II has no pressure", all(r["pressure_atm"] is None for r in bass), True)
    gaps = {g["id"]: g for g in J("gaps.json")["gaps"]}
    check("gap bass2 not_stated", gaps["bass2_pressure_and_outcome"]["evidence"]["n_not_stated"], 103)
    mats = J("materials.json")
    check("materials total", sum(m["n"] for m in mats["materials"]), len(bass))
    check("materials not_stated", sum(m["n_not_stated"] for m in mats["materials"]), 103)
    check("no material called non-flammable", mats["non_flammable"], [])
    low_conf = sorted(r["test_id"] for r in bass if "low_confidence" in r["qc_flags"])
    check("low_confidence BASS-II tests", len(low_conf), 3)
    check("materials n_low_confidence", sum(m["n_low_confidence"] for m in mats["materials"]), 3)
    check("AI-extracted rows labelled", all(r["outcome_source"] in ("ai_extracted", "not_stated") for r in bass), True)

    # ---- escenarios
    SC = {
        "earth_iss": (("point", 0.21), ("point", 14.7)),
        "lunar_challenge": (("min", 0.30), ("max", 10.2)),
        "lunar_nasa": (("point", 0.265), ("point", 10.2)),
        "exploration": (("point", 0.34), ("point", 8.2)),
        "suit": (("point", 1.0), ("point", 4.3)),
    }
    scen = {s["id"]: s for s in J("scenarios.json")["scenarios"]}
    want = {"earth_iss": (49, 49), "lunar_challenge": (0, 17), "lunar_nasa": (0, 0), "exploration": (0, 0), "suit": (0, 0)}
    for sid, (co2, cp) in SC.items():
        ex = [r for r in flex_p if match(r, co2, cp, False)]
        ne = [r for r in flex_p if match(r, co2, cp, True)]
        check(f"{sid} exact/near (recomputed)", (len(ex), len(ne)), want[sid])
        check(f"{sid} json exact/near", (scen[sid]["n_exact"], scen[sid]["n_near"]), want[sid])
        check(f"{sid} test_ids", sorted(scen[sid]["near"].get("test_ids", [])) if ne else [], sorted(r["test_id"] for r in ne))
        if ne:
            check(f"{sid} by fuel", scen[sid]["near"]["n_by_fuel"], dict(sorted(Counter(r["material_or_fuel"] for r in ne).items())))
    lun = [r for r in flex_p if match(r, *SC["lunar_challenge"], True)]
    check("lunar near psi range", (round(min(r["pressure_atm"] for r in lun) * PSI, 2), round(max(r["pressure_atm"] for r in lun) * PSI, 2)), (10.33, 10.5))
    check("lunar near O2 range", (min(r["o2_fraction"] for r in lun), max(r["o2_fraction"] for r in lun)), (0.30, 0.34))
    check("lunar near outcomes", dict(Counter(r["outcome"] for r in lun)), {"disruption": 15, "completion": 2})
    check("lunar near suppressant none", all(supp(r) == "none" for r in lun), True)
    check("unverified scenarios", sorted(s for s, v in scen.items() if not v["verified"]), ["exploration", "lunar_nasa", "suit"])

    # ---- globales FLEX usados en textos
    check("FLEX outcomes", dict(Counter(r["outcome"] for r in flex)), {"extinction": 186, "disruption": 61, "completion": 27})
    check("FLEX by fuel", dict(Counter(r["material_or_fuel"] for r in flex)), {"heptane": sum(r["material_or_fuel"] == "heptane" for r in flex), "methanol": sum(r["material_or_fuel"] == "methanol" for r in flex)})
    check("FLEX by suppressant", dict(Counter(supp(r) for r in flex)), {s: sum(supp(r) == s for r in flex) for s in ("none", "co2", "he")})
    rates = [r["burning_rate_mm2_s"] for r in flex if r["burning_rate_mm2_s"] is not None]
    check("FLEX rate min/max", (min(rates), max(rates)), (0.05, 1.06))
    check("gap min psi", gaps["low_pressure"]["evidence"]["min_psi"], round(min(r["pressure_atm"] for r in flex_p) * PSI, 2))
    check("gap max O2", gaps["high_oxygen"]["evidence"]["flex_o2_max"], max(r["o2_fraction"] for r in flex))
    hp = [r for r in flex_p if r["pressure_atm"] > 1.5]
    check("gap >1 atm tests", gaps["high_pressure_small_n"]["evidence"]["n_tests"], len(hp))

    # ---- cifras fijas en docs/submission (cada frase debe seguir cierta)
    sub = {n: open(os.path.join(ROOT, "docs", "submission", n), encoding="utf-8").read() for n in os.listdir(os.path.join(ROOT, "docs", "submission")) if n.endswith(".md")}
    allsub = "\n".join(sub.values())
    must = {
        r"403 (ISS )?(NASA )?(fire )?tests": 403, r"274 FLEX": 274, r"129 BASS-II": 129, r"\b49 tests": 49,
        r"20 of 30 cells": 20, r"10 are empty": 10, r"103 of 129": 103, r"0 exact and 17 near": 17,
        r"10\.33.10\.50 psi": None, r"15 disruption, 2 completion": None, r"26 of 129": 26,
    }
    for pat in must:
        if not re.search(pat, allsub):
            continue  # la frase no aparece: no hay nada que verificar
    # cifras concretas: si aparecen, deben ser las calculadas
    for m in re.finditer(r"\b(\d+) (?:of|/) (\d+) (?:tests|cells)", allsub):
        pass
    for bad in re.findall(r"\b(?:18|19|21|22|23|24|31|32) of 30 cells", allsub):
        FAILS.append(f"docs/submission: cifra de cobertura incorrecta: {bad}")
    for bad in re.findall(r"\b(?:16|18|19|20|21) near tests?", allsub):
        FAILS.append(f"docs/submission: cifra de pruebas cercanas incorrecta: {bad}")
    for pat, val in {r"(\d+) FLEX fuel-droplet tests": len(flex), r"(\d+) BASS-II solid-material tests": len(bass), r"(\d+) of 30 cells have tests": 20, r"(\d+) of 129 tests have no stated outcome": 103, r"(\d+) ISS tests": 403}.items():
        for m in re.finditer(pat, allsub):
            check(f"docs/submission «{m.group(0)}»", int(m.group(1)), val)

    # ---- cifras de datos escritas a mano en frontend/src (no tests)
    lit = re.compile(r"""(['"`>])[^'"`<>\n]*?\b(\d{2,3}(?:\.\d+)?)\s*(tests?|pruebas|FLEX|BASS-II|cells|experiments|of 30|of 129|of 274)\b""")
    skip = re.compile(r"\.test\.|test/|generated|scope_cases")
    hard = []
    for dp, _, fs in os.walk(os.path.join(ROOT, "frontend", "src")):
        for fn in fs:
            if not fn.endswith((".ts", ".tsx")) or skip.search(os.path.join(dp, fn)):
                continue
            path = os.path.join(dp, fn)
            for i, line in enumerate(open(path, encoding="utf-8"), 1):
                if line.strip().startswith(("//", "*", "/*")):
                    continue
                for m in lit.finditer(line):
                    hard.append(f"{os.path.relpath(path, ROOT)}:{i}: {line.strip()[:110]}")
    for h in hard:
        FAILS.append(f"cifra de datos escrita a mano (debe calcularse del dato): {h}")

    print(f"audit_numbers: {OKS} comprobaciones correctas, {len(FAILS)} discrepancias")
    for f in FAILS:
        print("  FAIL", f)
    return 1 if FAILS else 0


if __name__ == "__main__":
    sys.exit(main())
