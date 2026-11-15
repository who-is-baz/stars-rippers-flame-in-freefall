"""(Módulo puro: lo usan el backend, scripts/build_frontend_data.py y los tests.) Relevancia de cada prueba para una atmósfera: la MISMA fórmula que frontend/src/lib/relevance.ts (paridad comprobada con un
archivo de referencia, tests/test_relevance_parity.py). Orden transparente, sin pesos ocultos; NO es un ranking de seguridad.

Clase: exact → near → not_near → no_pressure (BASS-II y C11M201: solo se compara el O2). Dentro de la clase:
  1. distancia = max(|ΔO2|/tolO2, |Δpsi|/tolpsi) (en no_pressure solo |ΔO2|/tolO2), menor primero;
  2. resultado declarado antes de "not_stated"; 3. mayor n (pruebas de la misma celda); 4. programa y test_id.
Δ con signo: valor − objetivo (criterio puntual); para ≥ / ≤ es el faltante (0 si se cumple).
Completa/parcial: ver `is_complete` (definición en el README del repositorio y en la vista Sources & credits).
"""
from __future__ import annotations

from typing import Dict, List, Optional

import scenarios as sc  # noqa: E402  (src/ está en sys.path)

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
    for lv in sc.PRESSURE_LEVELS:  # misma regla que el front: [min, max)
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
