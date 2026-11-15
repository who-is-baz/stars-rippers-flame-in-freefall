"""Atmosphere scenarios, tolerances, O2 bands and pressure levels: defined ONCE, as data.

Everything else (API, front-end scripts, tests, docs) imports from here. To change a scenario or the tolerance,
change this file (and rebuild the front-end JSON files).

Counting rules (n_exact / n_near):
- A point criterion ("21 % O2", "14.7 psi") is met if the value is within tolerance: a measurement is never
  identical to the nominal value, so the tolerance IS the definition of "at that point". For those criteria,
  exacto y cercano coinciden.
- A bound criterion ("O2 >= 30 %", "<= 10.2 psi") is strict for n_exact and relaxed by the tolerance for n_near.
- If n_near = 0 the closest condition (`nearest`) is reported, which is NOT the scenario.
- Only FLEX has pressure. BASS-II records no pressure: an O2-only count is reported separately.
- Tests without pressure (C11M201) are excluded and listed in `excluded`.

Data access only through src/psi_queries.py: no SQL here.
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional

import psi_queries as q

PSI_PER_ATM = 14.6959
EPS = 1e-9  # keeps 0.21 - 0.01 from falling outside through binary rounding

TOLERANCE = {"o2_fraction": 0.01, "pressure_psi": 0.5}

# O2 bands: the same as psi_queries (a single definition); only re-exported here.
O2_BANDS = q.O2_BANDS

# DISCRETE pressure levels (FLEX was tested at only three levels; they are not continuous ranges).
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
    """Distance to the criterion (0 if strictly met), in the units of the value."""
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
    """n_exact, n_near and the detail of a scenario (FLEX), plus the O2-only count of BASS-II."""
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
        # Distance in "tolerances" (Euclidean); grouped by O2 (0.01) and pressure level of the closest test.
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
