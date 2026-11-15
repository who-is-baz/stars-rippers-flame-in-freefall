"""Parameterised queries over data/processed/psi.sqlite (FLEX + BASS-II from NASA PSI).

Uses only the standard library (sqlite3). The database is opened read only.

Each function returns list[dict]. Every row always includes:
    n            number of tests in the cell
    qc_flags     sorted list of the quality flags present in the cell
    source_doi   list of source DOIs
and, if the row has a percentage (`pct_*`):
    pct_note     "descriptive, not a probability"
    warning      texto obligatorio si n < MIN_N (si no, None)

Warning: FLEX sought the extinction limit iteratively (Test Plan, PDF p.4). An extinction % describes the tests
that were run; it does not estimate a probability. CO2/He effects are confounded with O2.
"""
from __future__ import annotations

import os
import sqlite3
from typing import Iterable, Optional, Sequence, Tuple

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "psi.sqlite")
MIN_N = 5
# Messages that reach the UI and the assistant are in English. See docs/API.md.
PCT_NOTE = "descriptive, not a probability"
SMALL_N_WARNING = "n<{min_n}: unstable percentage; do not read it as a rate"
LOW_CONFIDENCE_FLAG = "low_confidence"
LOW_CONFIDENCE_WARNING = ("includes low-confidence AI-extracted outcomes (pending human review); "
                          "show them with a warning")

PROGRAMS = ("FLEX", "BASS-II")
OUTCOMES = ("extinction", "disruption", "completion", "blowoff", "no_ignition", "not_sustained")
MAX_LIMIT = 500
SUPPRESSANTS = ("any", "none", "co2", "he")  # 'any' = no filter; 'none' = neither CO2 nor He
O2_BANDS: Tuple[Tuple[float, float, str], ...] = (
    (0.00, 0.15, "<0.15"),
    (0.15, 0.18, "0.15-0.18"),
    (0.18, 0.21, "0.18-0.21"),
    (0.21, 0.24, "0.21-0.24"),
    (0.24, 1.01, ">=0.24"),
)
Range = Optional[Tuple[Optional[float], Optional[float]]]

_SUPPRESSANT_SQL = {
    "any": "1=1",
    "none": "COALESCE(co2_fraction,0)=0 AND COALESCE(he_fraction,0)=0",
    "co2": "co2_fraction>0 AND COALESCE(he_fraction,0)=0",
    "he": "he_fraction>0 AND COALESCE(co2_fraction,0)=0",
}


# --------------------------------------------------------------------------- utilidades
def connect(db_path: str = DEFAULT_DB) -> sqlite3.Connection:
    path = os.path.abspath(db_path)
    if not os.path.exists(path):
        raise FileNotFoundError(f"{path} no existe; corre scripts/build_experiments.py")
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def o2_band_sql(col: str = "o2_fraction") -> str:
    parts = " ".join(f"WHEN {col} >= {lo} AND {col} < {hi} THEN '{label}'" for lo, hi, label in O2_BANDS)
    return f"CASE {parts} ELSE NULL END"


def _filters(program: Optional[str] = None, fuel: Optional[str] = None, o2_range: Range = None,
             pressure_range: Range = None, suppressant: str = "any") -> Tuple[str, list]:
    """Builds the WHERE clause with placeholders. Validates enumerated values."""
    where, args = [], []
    if program is not None:
        if program not in PROGRAMS:
            raise ValueError(f"program must be one of {PROGRAMS}")
        where.append("program = ?"); args.append(program)
    if fuel is not None:
        where.append("material_or_fuel = ?"); args.append(fuel)
    for col, rng in (("o2_fraction", o2_range), ("pressure_atm", pressure_range)):
        if rng is not None:
            lo, hi = rng
            if lo is not None:
                where.append(f"{col} >= ?"); args.append(lo)
            if hi is not None:
                where.append(f"{col} <= ?"); args.append(hi)
    if suppressant not in SUPPRESSANTS:
        raise ValueError(f"suppressant must be one of {SUPPRESSANTS}")
    where.append(_SUPPRESSANT_SQL[suppressant])
    return " AND ".join(where) or "1=1", args


_META_SQL = "COUNT(*) AS n, GROUP_CONCAT(DISTINCT qc_flags) AS _flags, GROUP_CONCAT(DISTINCT source_doi) AS _dois"


def _finalize(rows: Iterable[sqlite3.Row], min_n: int = MIN_N) -> list:
    out = []
    for r in rows:
        d = dict(r)
        flags = set()
        for chunk in (d.pop("_flags") or "").split(","):
            flags.update(f for f in chunk.split(";") if f)
        d["qc_flags"] = sorted(flags)
        d["source_doi"] = sorted(set((d.pop("_dois") or "").split(",")) - {""})
        if LOW_CONFIDENCE_FLAG in flags:
            d["low_confidence_warning"] = LOW_CONFIDENCE_WARNING
        if any(k.startswith("pct_") for k in d):
            d["pct_note"] = PCT_NOTE
            d["warning"] = SMALL_N_WARNING.format(min_n=min_n) if d["n"] < min_n else None
        out.append(d)
    return out


def _run(con: sqlite3.Connection, sql: str, args: Sequence, min_n: int = MIN_N) -> list:
    return _finalize(con.execute(sql, list(args)).fetchall(), min_n)


# --------------------------------------------------------------------------- Q1–Q6
def extinction_rate_by_o2_pressure(con, program="FLEX", fuel="methanol", o2_range: Range = None,
                                   pressure_range: Range = None, suppressant="none", min_n=MIN_N):
    """Q1. % of tests that ended in extinction, by pressure (0.1 atm) and X_O2 (0.01)."""
    w, a = _filters(program, fuel, o2_range, pressure_range, suppressant)
    sql = f"""
        SELECT ROUND(pressure_atm,1) AS pressure_atm, ROUND(o2_fraction,2) AS o2_fraction, {_META_SQL},
               SUM(outcome='extinction') AS n_extinction,
               ROUND(100.0*SUM(outcome='extinction')/COUNT(*),1) AS pct_extinction
        FROM experiments WHERE {w} AND outcome IS NOT NULL
        GROUP BY 1,2 ORDER BY 1,2"""
    return _run(con, sql, a, min_n)


def suppressant_effect(con, suppressant: str, program="FLEX", fuel=None, o2_range: Range = None,
                       pressure_range: Range = (0.9, 1.1), min_n=MIN_N):
    """Q2/Q3 (generic). By fuel, pressure and suppressant level; includes level 0 as the reference.

    Includes avg_o2_fraction so the confounding with O2 is visible."""
    if suppressant not in ("co2", "he"):
        raise ValueError("suppressant must be 'co2' or 'he'")
    other = "he_fraction" if suppressant == "co2" else "co2_fraction"
    col = f"{suppressant}_fraction"
    w, a = _filters(program, fuel, o2_range, pressure_range, "any")
    sql = f"""
        SELECT material_or_fuel AS fuel, ROUND(pressure_atm,1) AS pressure_atm,
               ROUND({col},2) AS {col}, {_META_SQL},
               ROUND(100.0*SUM(outcome='extinction')/COUNT(*),1) AS pct_extinction,
               ROUND(AVG(o2_fraction),3) AS avg_o2_fraction,
               ROUND(AVG(burning_rate_mm2_s),3) AS avg_burning_rate_mm2_s
        FROM experiments WHERE {w} AND COALESCE({other},0)=0
        GROUP BY 1,2,3 ORDER BY 1,2,3"""
    return _run(con, sql, a, min_n)


def co2_effect(con, **kw):
    """Q2. CO2 effect (default ~1 atm)."""
    return suppressant_effect(con, "co2", **kw)


def he_effect(con, **kw):
    """Q3. He effect (default: all pressures, because He was tested mostly at 0.7 atm)."""
    kw.setdefault("pressure_range", None)
    return suppressant_effect(con, "he", **kw)


def burning_rate_by_o2(con, program="FLEX", fuel=None, o2_range: Range = None,
                       pressure_range: Range = (0.9, 1.1), suppressant="none", min_n=MIN_N):
    """Q4. K (mm²/s) by fuel and X_O2. n counts the tests; n_k, those with K."""
    w, a = _filters(program, fuel, o2_range, pressure_range, suppressant)
    sql = f"""
        SELECT material_or_fuel AS fuel, ROUND(o2_fraction,2) AS o2_fraction, {_META_SQL},
               COUNT(burning_rate_mm2_s) AS n_k,
               ROUND(MIN(burning_rate_mm2_s),3) AS min_burning_rate_mm2_s,
               ROUND(AVG(burning_rate_mm2_s),3) AS avg_burning_rate_mm2_s,
               ROUND(MAX(burning_rate_mm2_s),3) AS max_burning_rate_mm2_s
        FROM experiments WHERE {w}
        GROUP BY 1,2 ORDER BY 1,2"""
    return _run(con, sql, a, min_n)


def extinction_diameter_by_pressure(con, program="FLEX", fuel=None, o2_range: Range = None,
                                    pressure_range: Range = None, suppressant="any", min_n=MIN_N):
    """Q5. Extinction diameter (outcome = extinction only) by fuel and pressure."""
    w, a = _filters(program, fuel, o2_range, pressure_range, suppressant)
    sql = f"""
        SELECT material_or_fuel AS fuel, ROUND(pressure_atm,1) AS pressure_atm, {_META_SQL},
               COUNT(extinction_diameter_mm) AS n_d,
               ROUND(AVG(extinction_diameter_mm),3) AS avg_extinction_diameter_mm,
               ROUND(MIN(extinction_diameter_mm),3) AS min_extinction_diameter_mm,
               ROUND(MAX(extinction_diameter_mm),3) AS max_extinction_diameter_mm
        FROM experiments WHERE {w} AND outcome='extinction'
        GROUP BY 1,2 ORDER BY 1,2"""
    return _run(con, sql, a, min_n)


def bass2_outcomes_by_o2_band(con, material: Optional[str] = None, o2_range: Range = None, min_n=MIN_N):
    """Q6. BASS-II: outcome counts by O2 band.

    The BASS-II outcome was extracted by AI from notes; 'not_stated' does NOT mean there was no extinction.
    That is why counts and pct_outcome_stated are reported, and not an extinction %."""
    w, a = _filters("BASS-II", material, o2_range, None, "any")
    sql = f"""
        SELECT {o2_band_sql()} AS o2_band, {_META_SQL},
               -- COALESCE: outcome is NULL for 'not_stated'; SUM over only NULLs would give NULL, not 0
               SUM(COALESCE(outcome,'')='extinction') AS n_low_flow_extinction,
               SUM(COALESCE(outcome,'')='blowoff') AS n_blowoff,
               SUM(COALESCE(outcome,'') IN ('no_ignition','not_sustained')) AS n_no_ignition_or_not_sustained,
               SUM(outcome_source='not_stated') AS n_not_stated,
               ROUND(100.0*SUM(outcome_source<>'not_stated')/COUNT(*),1) AS pct_outcome_stated
        FROM experiments WHERE {w}
        GROUP BY 1 ORDER BY MIN(o2_fraction)"""  # by O2 value, not by label ("<0.15" comes first)
    return _run(con, sql, a, min_n)


ALL_QUERIES = {
    "q1_extinction_rate_by_o2_pressure": extinction_rate_by_o2_pressure,
    "q2_co2_effect": co2_effect,
    "q3_he_effect": he_effect,
    "q4_burning_rate_by_o2": burning_rate_by_o2,
    "q5_extinction_diameter_by_pressure": extinction_diameter_by_pressure,
    "q6_bass2_outcomes_by_o2_band": bass2_outcomes_by_o2_band,
}


# --------------------------------------------------------------------------- filas y metadatos
def list_experiments(con, program=None, fuel=None, o2_range: Range = None, pressure_range: Range = None,
                     suppressant="any", outcome: Optional[str] = None, limit: int = 100, offset: int = 0):
    """GET /experiments. Unaggregated rows of experiments, paginated.

    Returns {"total": n rows that match the filters, "items": [row, ...]}. qc_flags is a list (as in Q1–Q6).
    outcome='not_stated' returns the rows without an outcome (BASS-II), which does NOT mean they did not go out."""
    if outcome is not None and outcome not in OUTCOMES + ("not_stated",):
        raise ValueError(f"outcome must be one of {OUTCOMES + ('not_stated',)}")
    if not (isinstance(limit, int) and 1 <= limit <= MAX_LIMIT):
        raise ValueError(f"limit must be an integer between 1 and {MAX_LIMIT}")
    if not (isinstance(offset, int) and offset >= 0):
        raise ValueError("offset must be an integer >= 0")
    w, a = _filters(program, fuel, o2_range, pressure_range, suppressant)
    if outcome == "not_stated":
        w += " AND outcome_source = 'not_stated'"
    elif outcome is not None:
        w += " AND outcome = ?"; a.append(outcome)
    total = con.execute(f"SELECT COUNT(*) FROM experiments WHERE {w}", a).fetchone()[0]
    rows = con.execute(f"SELECT * FROM experiments WHERE {w} ORDER BY program, test_id LIMIT ? OFFSET ?",
                       a + [limit, offset]).fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["qc_flags"] = [f for f in (d["qc_flags"] or "").split(";") if f]
        if LOW_CONFIDENCE_FLAG in d["qc_flags"]:
            d["low_confidence_warning"] = LOW_CONFIDENCE_WARNING
        items.append(d)
    return {"total": total, "items": items}


def get_experiment(con, test_id: str, program: Optional[str] = None) -> list:
    """GET /compare (and /ask). Every row with that test_id (193F001 is repeated in FLEX). [] if it does not exist."""
    w, a = _filters(program, None, None, None, "any")
    rows = con.execute(f"SELECT * FROM experiments WHERE {w} AND test_id = ? ORDER BY program, test_id",
                       a + [test_id]).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["qc_flags"] = [f for f in (d["qc_flags"] or "").split(";") if f]
        if LOW_CONFIDENCE_FLAG in d["qc_flags"]:
            d["low_confidence_warning"] = LOW_CONFIDENCE_WARNING
        out.append(d)
    return out


def query_test_ids(con, query: str, **kw) -> dict:
    """test_id of the tests included in a Q1–Q6 query with those parameters, by DOI.

    Used by /ask for citations: code (not the model) sets the test_ids. It repeats each query's filters;
    defaults are those of the matching function. Returns {source_doi: [test_id, ...]}."""
    if query not in ALL_QUERIES:
        raise ValueError(f"query must be one of {sorted(ALL_QUERIES)}")
    kw = dict(kw)
    kw.pop("min_n", None)
    o2, pr = kw.get("o2_range"), kw.get("pressure_range")
    extra = ""
    if query == "q1_extinction_rate_by_o2_pressure":
        w, a = _filters(kw.get("program", "FLEX"), kw.get("fuel", "methanol"), o2, pr, kw.get("suppressant", "none"))
        extra = " AND outcome IS NOT NULL"
    elif query in ("q2_co2_effect", "q3_he_effect"):
        supp = "co2" if query == "q2_co2_effect" else "he"
        if "pressure_range" not in kw:
            pr = (0.9, 1.1) if supp == "co2" else None
        other = "he_fraction" if supp == "co2" else "co2_fraction"
        w, a = _filters(kw.get("program", "FLEX"), kw.get("fuel"), o2, pr, "any")
        extra = f" AND COALESCE({other},0)=0"
    elif query == "q4_burning_rate_by_o2":
        if "pressure_range" not in kw:
            pr = (0.9, 1.1)
        w, a = _filters(kw.get("program", "FLEX"), kw.get("fuel"), o2, pr, kw.get("suppressant", "none"))
    elif query == "q5_extinction_diameter_by_pressure":
        w, a = _filters(kw.get("program", "FLEX"), kw.get("fuel"), o2, pr, kw.get("suppressant", "any"))
        extra = " AND outcome='extinction'"
    else:  # q6
        w, a = _filters("BASS-II", kw.get("material"), o2, None, "any")
    out: dict = {}
    for doi, tid in con.execute(f"SELECT source_doi, test_id FROM experiments WHERE {w}{extra} "
                                "ORDER BY source_doi, test_id", a):
        ids = out.setdefault(doi, [])
        if not ids or ids[-1] != tid:
            ids.append(tid)
    return out


def meta(con):
    """GET /meta. Valid filter values and data ranges (computed, not fixed)."""
    progs = []
    for r in con.execute("""SELECT program, COUNT(*) AS n, MIN(o2_fraction) AS o2_min, MAX(o2_fraction) AS o2_max,
                                   MIN(pressure_atm) AS pressure_min, MAX(pressure_atm) AS pressure_max,
                                   MIN(source_doi) AS source_doi
                            FROM experiments GROUP BY program ORDER BY program"""):
        d = dict(r)
        d["materials"] = [x[0] for x in con.execute(
            "SELECT DISTINCT material_or_fuel FROM experiments WHERE program=? ORDER BY 1", (d["program"],))]
        d["material_categories"] = [x[0] for x in con.execute(
            "SELECT DISTINCT material_category FROM experiments WHERE program=? AND material_category IS NOT NULL "
            "ORDER BY 1", (d["program"],))]
        progs.append(d)
    return {
        "programs": progs,
        "suppressants": list(SUPPRESSANTS),
        "outcomes": list(OUTCOMES) + ["not_stated"],
        "o2_bands": [{"label": l, "min_inclusive": lo, "max_exclusive": hi} for lo, hi, l in O2_BANDS],
        "min_n": MIN_N,
        "queries": sorted(ALL_QUERIES),
        "source_doi": sorted({p["source_doi"] for p in progs}),
    }


# --------------------------------------------------------------------------- coverage grid
def flex_coverage_grid(con, min_n=MIN_N):
    """FLEX cells by fuel × O2 band × pressure × suppressant."""
    supp = ("CASE WHEN COALESCE(co2_fraction,0)>0 AND COALESCE(he_fraction,0)>0 THEN 'co2+he' "
            "WHEN co2_fraction>0 THEN 'co2' WHEN he_fraction>0 THEN 'he' ELSE 'none' END")
    sql = f"""
        SELECT material_or_fuel AS fuel, {o2_band_sql()} AS o2_band,
               COALESCE(CAST(ROUND(pressure_atm,1) AS TEXT),'unknown') AS pressure_atm_level,
               {supp} AS suppressant, {_META_SQL},
               ROUND(MIN(co2_fraction+he_fraction),3) AS suppressant_fraction_min,
               ROUND(MAX(co2_fraction+he_fraction),3) AS suppressant_fraction_max,
               ROUND(MIN(o2_fraction),3) AS o2_fraction_min, ROUND(MAX(o2_fraction),3) AS o2_fraction_max,
               COUNT(burning_rate_mm2_s) AS n_burning_rate,
               ROUND(AVG(burning_rate_mm2_s),3) AS avg_burning_rate_mm2_s,
               SUM(outcome='extinction') AS n_extinction,
               COUNT(CASE WHEN outcome='extinction' THEN extinction_diameter_mm END) AS n_extinction_diameter,
               ROUND(AVG(CASE WHEN outcome='extinction' THEN extinction_diameter_mm END),3) AS avg_extinction_diameter_mm,
               SUM(outcome='disruption') AS n_disruption, SUM(outcome='completion') AS n_completion,
               ROUND(100.0*SUM(outcome='extinction')/COUNT(*),1) AS pct_extinction
        FROM experiments WHERE program='FLEX'
        GROUP BY 1,2,3,4 ORDER BY 1, MIN(o2_fraction), 3, 4"""  # bands by O2 value, not by label
    return _run(con, sql, [], min_n)
