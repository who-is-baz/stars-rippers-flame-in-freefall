"""Escenarios de atmósfera, tolerancias, bandas de O2 y niveles de presión: definidos UNA sola vez, como datos.

Todo lo demás (API, scripts del frontend, tests, docs) importa de aquí. Para cambiar un escenario o la tolerancia,
se cambia este archivo (y se regeneran los JSON del frontend).

Reglas de conteo (n_exact / n_near):
- Un criterio de valor puntual ("21 % O2", "14.7 psi") se cumple si el dato está dentro de la tolerancia: una medida
  nunca es idéntica al valor nominal, así que la tolerancia ES la definición de "en ese punto". Para esos criterios,
  exacto y cercano coinciden.
- Un criterio de límite ("O2 >= 30 %", "<= 10.2 psi") es estricto en n_exact y se relaja con la tolerancia en n_near.
- Si n_near = 0 se informa la condición más cercana (`nearest`), que NO es el escenario.
- Solo FLEX tiene presión. BASS-II no registra presión: se informa aparte un conteo solo por O2.
- Las pruebas sin presión (C11M201) se excluyen y se listan en `excluded`.

Acceso a datos solo por src/psi_queries.py: aquí no hay SQL.
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional

import psi_queries as q

PSI_PER_ATM = 14.6959
EPS = 1e-9  # evita que 0.21 - 0.01 quede fuera por redondeo binario

TOLERANCE = {"o2_fraction": 0.01, "pressure_psi": 0.5}

# Bandas de O2: las mismas de psi_queries (una sola definición); aquí solo se re-exportan.
O2_BANDS = q.O2_BANDS

# Niveles de presión DISCRETOS (FLEX solo se probó en tres niveles; no son rangos continuos).
PRESSURE_LEVELS = (
    {"label": "~0.7 atm", "atm_min": 0.6, "atm_max": 0.8},
    {"label": "~1.0 atm", "atm_min": 0.9, "atm_max": 1.1},
    {"label": ">2 atm", "atm_min": 2.0, "atm_max": None},
)

CHALLENGE = "Official challenge text (docs/08-reto-oficial.md)"

SCENARIOS: List[Dict] = [
    {
        "id": "earth_iss",
        "label": "Earth / ISS reference air",
        "o2": {"kind": "point", "value": 0.21},
        "pressure_psi": {"kind": "point", "value": 14.7},
        "source": "Reference: sea-level air and ISS cabin (21% O2, 14.7 psi; 1 atm = 14.696 psi)",
        "quote": None,
        "verified": True,
        "note": None,
    },
    {
        "id": "lunar_challenge",
        "label": "Expected Moon-base air (challenge statement)",
        "o2": {"kind": "min", "value": 0.30},
        "pressure_psi": {"kind": "max", "value": 10.2},
        "source": CHALLENGE,
        "quote": ("The intermediate oxygen concentration used on the Moon will likely be 30% or greater, "
                  "with a corresponding pressure of 10.2 psi or less."),
        "verified": True,
        "note": "Estimate from the challenge statement, not a NASA technical specification.",
    },
    {
        "id": "lunar_nasa",
        "label": "NASA lunar surface habitat (nominal)",
        "o2": {"kind": "point", "value": 0.265},
        "pressure_psi": {"kind": "point", "value": 10.2},
        "source": ("NASA/TM-20220000524, Moon to Mars (M2M) Habitation Considerations (Jan 2022), p.14; "
                   "NASA SAO LAT, Evolution to Sustainable Lunar Habitation (Aug 2024, NTRS 20240010692), p.12"),
        "quote": ("...a nominal operating pressure of 10.2 psia (70.3 kPa) and 26.5% Oxygen concentration and the "
                  "capability to operate at 8.2 psi (56.5 kPa)and 34% Oxygen."),
        "verified": False,
        "note": "Pending: a team member confirms the citation.",
    },
    {
        "id": "exploration",
        "label": "NASA Exploration Atmosphere",
        "o2": {"kind": "point", "value": 0.34},
        "pressure_psi": {"kind": "point", "value": 8.2},
        "source": ("NASA/TM-2013-217377; NTRS 20150021491 (Evidence Report: Risk of Hypobaric Hypoxia from the "
                   "Exploration Atmosphere, 2015), p.4"),
        "quote": ("After re-evaluation in 2012, the 8/32 environment was altered to 8.2 psia and 34% O2 to reduce "
                  "the hypoxic stress to a crewmember."),
        "verified": False,
        "note": ("Pending: a team member confirms the citation. The quote is from NTRS 20150021491; NASA/TM-2013-217377 was "
                 "not read in this session and its title refers to the earlier 8 psia / 32% O2 atmosphere."),
    },
    {
        "id": "suit",
        "label": "Spacesuit",
        "o2": {"kind": "point", "value": 1.00},
        "pressure_psi": {"kind": "point", "value": 4.3},
        "source": CHALLENGE,
        "quote": "To enable flexibility, spacesuits are filled with 100% oxygen to only 4.3 psi",
        "verified": False,
        "note": ("Other sources differ: 85% O2 at 4.3 psia (simulated EVA, NTRS 20220015741) and 100% O2 at 5.0 psi "
                 "(reported by the team; source not recorded here)."),
    },
]


# --------------------------------------------------------------------------- utilidades
def psi(atm: Optional[float]) -> Optional[float]:
    return None if atm is None else atm * PSI_PER_ATM


def o2_band(o2: Optional[float]) -> Optional[str]:
    if o2 is None:
        return None
    for lo, hi, label in O2_BANDS:
        if lo <= o2 < hi:
            return label
    return None


def pressure_level(atm: Optional[float]) -> Optional[str]:
    if atm is None:
        return None
    for lv in PRESSURE_LEVELS:
        if atm >= lv["atm_min"] and (lv["atm_max"] is None or atm <= lv["atm_max"]):
            return lv["label"]
    return None


def _ok(x: float, crit: Dict, tol: float, relaxed: bool) -> bool:
    v = crit["value"]
    if crit["kind"] == "point":
        return abs(x - v) <= tol + EPS
    slack = tol if relaxed else 0.0
    if crit["kind"] == "min":
        return x >= v - slack - EPS
    if crit["kind"] == "max":
        return x <= v + slack + EPS
    raise ValueError(f"criterio desconocido: {crit['kind']}")


def _shortfall(x: float, crit: Dict) -> float:
    """Distancia al criterio (0 si se cumple estrictamente), en las unidades del dato."""
    v = crit["value"]
    if crit["kind"] == "point":
        return abs(x - v)
    if crit["kind"] == "min":
        return max(0.0, v - x)
    return max(0.0, x - v)


def _summary(rows: List[Dict]) -> Dict:
    if not rows:
        return {"n": 0}
    o2 = [r["o2_fraction"] for r in rows]
    atm = [r["pressure_atm"] for r in rows]
    count = lambda key: {k: sum(1 for r in rows if r[key] == k) for k in sorted({r[key] for r in rows if r[key]})}
    return {
        "n": len(rows),
        "o2_min": min(o2), "o2_max": max(o2),
        "atm_min": round(min(atm), 4), "atm_max": round(max(atm), 4),
        "psi_min": round(psi(min(atm)), 2), "psi_max": round(psi(max(atm)), 2),
        "n_by_fuel": count("material_or_fuel"),
        "n_by_outcome": count("outcome"),
        "test_ids": sorted(r["test_id"] for r in rows),
    }


def _rows(con, program: str) -> List[Dict]:
    return q.list_experiments(con, program=program, limit=q.MAX_LIMIT)["items"]


# --------------------------------------------------------------------------- conteo
def evaluate(con, scenario: Dict) -> Dict:
    """n_exact, n_near y el detalle de un escenario (FLEX), más el conteo solo por O2 de BASS-II."""
    flex = _rows(con, "FLEX")
    excluded = [r for r in flex if r["pressure_atm"] is None]
    usable = [r for r in flex if r["pressure_atm"] is not None]
    o2c, pc = scenario["o2"], scenario["pressure_psi"]
    tol_o2, tol_p = TOLERANCE["o2_fraction"], TOLERANCE["pressure_psi"]

    def match(r, relaxed):
        return _ok(r["o2_fraction"], o2c, tol_o2, relaxed) and _ok(psi(r["pressure_atm"]), pc, tol_p, relaxed)

    exact = [r for r in usable if match(r, False)]
    near = [r for r in usable if match(r, True)]
    out = {k: scenario[k] for k in ("id", "label", "source", "quote", "verified", "note")}
    out.update({
        "criteria": {"o2": o2c, "pressure_psi": pc, "tolerance": dict(TOLERANCE)},
        "program": "FLEX",
        "n_exact": len(exact),
        "n_near": len(near),
        "exact": _summary(exact),
        "near": _summary(near),
        "nearest": None,
        "excluded": [{"test_id": r["test_id"], "reason": "no pressure recorded"} for r in excluded],
    })
    if not near and usable:
        # Distancia en "tolerancias" (Euclídea); se agrupa por O2 (0.01) y nivel de presión de la prueba más cercana.
        dist = lambda r: math.hypot(_shortfall(r["o2_fraction"], o2c) / tol_o2,
                                    _shortfall(psi(r["pressure_atm"]), pc) / tol_p)
        best = min(usable, key=dist)
        key = (round(best["o2_fraction"], 2), pressure_level(best["pressure_atm"]))
        group = [r for r in usable if (round(r["o2_fraction"], 2), pressure_level(r["pressure_atm"])) == key]
        out["nearest"] = {**_summary(group), "pressure_level": key[1],
                          "distance_in_tolerances": round(min(dist(r) for r in group), 2),
                          "note": "Closest tested condition; it is NOT this scenario."}
    bass = _rows(con, "BASS-II")
    b_match = [r for r in bass if r["o2_fraction"] is not None and _ok(r["o2_fraction"], o2c, tol_o2, True)]
    out["bass2_o2_only"] = {
        "n": len(b_match),
        "note": "BASS-II has no recorded pressure: count by O2 only (measured, not set), with tolerance.",
    }
    return out


def evaluate_all(con) -> List[Dict]:
    return [evaluate(con, s) for s in SCENARIOS]


def get(scenario_id: str) -> Dict:
    for s in SCENARIOS:
        if s["id"] == scenario_id:
            return s
    raise KeyError(scenario_id)
