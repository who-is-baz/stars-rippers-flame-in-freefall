"""Consultas parametrizadas sobre data/processed/psi.sqlite (FLEX + BASS-II de NASA PSI).

Solo usa la librería estándar (sqlite3). La base se abre en modo de solo lectura.

Cada función devuelve list[dict]. Cada fila incluye siempre:
    n            número de pruebas en la celda
    qc_flags     lista ordenada de flags de calidad presentes en la celda
    source_doi   lista de DOI de origen
y, si la fila tiene un porcentaje (`pct_*`):
    pct_note     "descriptivo, no probabilidad"
    warning      texto obligatorio si n < MIN_N (si no, None)

Advertencia: FLEX buscó el límite de extinción de forma iterativa (Test Plan, PDF p.4). Un % de extinción
describe las pruebas realizadas; no estima una probabilidad. Los efectos de CO2/He están confundidos con el O2.
"""
from __future__ import annotations

import os
import sqlite3
from typing import Iterable, Optional, Sequence, Tuple

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "psi.sqlite")
MIN_N = 5
PCT_NOTE = "descriptivo, no probabilidad"
SMALL_N_WARNING = "n<{min_n}: porcentaje inestable; no interpretar como tasa"

PROGRAMS = ("FLEX", "BASS-II")
SUPPRESSANTS = ("any", "none", "co2", "he")  # 'any' = sin filtro; 'none' = sin CO2 ni He
O2_BANDS: Tuple[Tuple[float, float, str], ...] = (
    (0.00, 0.15, "0.12-0.15"),
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
    """Arma el WHERE con placeholders. Valida los valores enumerados."""
    where, args = [], []
    if program is not None:
        if program not in PROGRAMS:
            raise ValueError(f"program debe ser uno de {PROGRAMS}")
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
        raise ValueError(f"suppressant debe ser uno de {SUPPRESSANTS}")
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
    """Q1. % de pruebas que terminaron en extinción, por presión (0.1 atm) y X_O2 (0.01)."""
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
    """Q2/Q3 (genérica). Por combustible, presión y nivel de supresor; incluye el nivel 0 como referencia.

    Incluye avg_o2_fraction para hacer visible el confundido con O2."""
    if suppressant not in ("co2", "he"):
        raise ValueError("suppressant debe ser 'co2' o 'he'")
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
    """Q2. Efecto del CO2 (por defecto ~1 atm)."""
    return suppressant_effect(con, "co2", **kw)


def he_effect(con, **kw):
    """Q3. Efecto del He (por defecto todas las presiones, porque el He se probó sobre todo a 0.7 atm)."""
    kw.setdefault("pressure_range", None)
    return suppressant_effect(con, "he", **kw)


def burning_rate_by_o2(con, program="FLEX", fuel=None, o2_range: Range = None,
                       pressure_range: Range = (0.9, 1.1), suppressant="none", min_n=MIN_N):
    """Q4. K (mm²/s) por combustible y X_O2. n cuenta las pruebas; n_k, las que tienen K."""
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
    """Q5. Diámetro de extinción (solo outcome = extinction) por combustible y presión."""
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
    """Q6. BASS-II: conteo de resultados por banda de O2.

    El outcome de BASS-II se extrajo con IA de notas; 'not_stated' NO significa que no hubo extinción.
    Por eso se reportan conteos y pct_outcome_stated, y no un % de extinción."""
    w, a = _filters("BASS-II", material, o2_range, None, "any")
    sql = f"""
        SELECT {o2_band_sql()} AS o2_band, {_META_SQL},
               -- COALESCE: outcome es NULL en 'not_stated'; SUM de puros NULL daría NULL, no 0
               SUM(COALESCE(outcome,'')='extinction') AS n_low_flow_extinction,
               SUM(COALESCE(outcome,'')='blowoff') AS n_blowoff,
               SUM(COALESCE(outcome,'') IN ('no_ignition','not_sustained')) AS n_no_ignition_or_not_sustained,
               SUM(outcome_source='not_stated') AS n_not_stated,
               ROUND(100.0*SUM(outcome_source<>'not_stated')/COUNT(*),1) AS pct_outcome_stated
        FROM experiments WHERE {w}
        GROUP BY 1 ORDER BY 1"""
    return _run(con, sql, a, min_n)


ALL_QUERIES = {
    "q1_extinction_rate_by_o2_pressure": extinction_rate_by_o2_pressure,
    "q2_co2_effect": co2_effect,
    "q3_he_effect": he_effect,
    "q4_burning_rate_by_o2": burning_rate_by_o2,
    "q5_extinction_diameter_by_pressure": extinction_diameter_by_pressure,
    "q6_bass2_outcomes_by_o2_band": bass2_outcomes_by_o2_band,
}


# --------------------------------------------------------------------------- coverage grid
def flex_coverage_grid(con, min_n=MIN_N):
    """Celdas de FLEX por combustible × banda de O2 × presión × supresor."""
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
        GROUP BY 1,2,3,4 ORDER BY 1,2,3,4"""
    return _run(con, sql, [], min_n)
