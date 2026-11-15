"""(Pure module: used by the backend, scripts/build_frontend_data.py and the tests.) Relevance of each test for an atmosphere: the SAME formula as frontend/src/lib/relevance.ts (parity checked against an
reference file, tests/test_relevance_parity.py). Transparent order, no hidden weights; it is NOT a safety ranking.

Class: exact → near → not_near → no_pressure (BASS-II and C11M201: only O2 is compared). Within a class:
  1. distance = max(|ΔO2|/tolO2, |Δpsi|/tolpsi) (for no_pressure only |ΔO2|/tolO2), smaller first;
  2. declared outcome before "not_stated"; 3. larger n (tests in the same cell); 4. program and test_id.
Signed Δ: value − target (point criterion); for ≥ / ≤ it is the shortfall (0 when met).
Complete/partial: see `is_complete` (definition in the Sources & credits view).
"""
from __future__ import annotations

from typing import Dict, List, Optional

import scenarios as sc  # noqa: E402  (src/ is on sys.path)

EPS = 1e-9
ORDER = {"exact": 0, "near": 1, "not_near": 2, "no_pressure": 3}
LABEL = {"exact": "Exact", "near": "Near", "not_near": "Not near", "no_pressure": "No pressure recorded"}


def is_declared(r: dict) -> bool:
    return r["outcome"] is not None and r["outcome_source"] != "not_stated"


def is_complete(r: dict) -> bool:
    base = r["o2_fraction"] is not None and is_declared(r)
    if r["program"] == "FLEX":
        return bool(base and r["material_or_fuel"] and r["pressure_atm"] is not None
                    and (r["burning_rate_mm2_s"] is not None or r["extinction_diameter_mm"] is not None))
    return bool(base and r["material_category"])


def _delta(x: float, c: dict) -> float:
    if c["kind"] == "point":
        return x - c["value"]
    return min(0.0, x - c["value"]) if c["kind"] == "min" else max(0.0, x - c["value"])


def _within(d: float, tol: float, strict: bool, kind: str) -> bool:
    return abs(d) <= tol + EPS if kind == "point" else (abs(d) <= EPS if strict else abs(d) <= tol + EPS)


def _level(atm: Optional[float]) -> Optional[str]:
    if atm is None:
        return None
    for lv in sc.PRESSURE_LEVELS:  # same rule as the front end: [min, max)
        if atm >= lv["atm_min"] and (lv["atm_max"] is None or atm < lv["atm_max"]):
            return lv["label"]
    return None


def cell_key(r: dict) -> str:
    kind = r["material_or_fuel"] if r["program"] == "FLEX" else r["material_category"]
    return f"{r['program']}|{kind}|{sc.o2_band(r['o2_fraction']) or '-'}|{_level(r['pressure_atm']) or '-'}"


def rank(rows: List[dict], o2: dict, pressure_psi: dict, tol: Optional[dict] = None) -> List[dict]:
    tol = tol or sc.TOLERANCE
    counts: Dict[str, int] = {}
    for r in rows:
        counts[cell_key(r)] = counts.get(cell_key(r), 0) + 1
    out = []
    for r in rows:
        d_o2 = _delta(r["o2_fraction"], o2)
        n, declared = counts[cell_key(r)], is_declared(r)
        if r["pressure_atm"] is None:
            out.append({"row": r, "relevance": "no_pressure", "d_o2": d_o2, "d_psi": None, "distance": abs(d_o2) / tol["o2_fraction"], "n": n, "declared": declared})
            continue
        d_psi = _delta(sc.psi(r["pressure_atm"]), pressure_psi)
        dist = max(abs(d_o2) / tol["o2_fraction"], abs(d_psi) / tol["pressure_psi"])
        exact = _within(d_o2, tol["o2_fraction"], True, o2["kind"]) and _within(d_psi, tol["pressure_psi"], True, pressure_psi["kind"])
        near = _within(d_o2, tol["o2_fraction"], False, o2["kind"]) and _within(d_psi, tol["pressure_psi"], False, pressure_psi["kind"])
        out.append({"row": r, "relevance": "exact" if exact else "near" if near else "not_near", "d_o2": d_o2, "d_psi": d_psi, "distance": dist, "n": n, "declared": declared})
    out.sort(key=lambda x: (ORDER[x["relevance"]], x["distance"], not x["declared"], -x["n"], x["row"]["program"], x["row"]["test_id"]))
    return out


def counts(ranked: List[dict]) -> Dict[str, int]:
    c = {"exact": 0, "near": 0, "not_near": 0, "no_pressure": 0}
    for r in ranked:
        c[r["relevance"]] += 1
    return c


def scenario_criteria(scenario_id: str) -> tuple:
    s = sc.get(scenario_id)
    return s["o2"], s["pressure_psi"]
