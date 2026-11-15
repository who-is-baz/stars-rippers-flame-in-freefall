"""Acceso a datos del backend: conexión de solo lectura, campos comunes y respuestas precalculadas.

Todo pasa por src/psi_queries.py y src/scenarios.py (regla 4 de CLAUDE.md). Los textos de limitaciones y las
respuestas del modo `low` se toman de scripts/build_frontend_data.py: así el backend y answers.json salen del
mismo código (paridad por construcción, comprobada en tests/test_api_ask_low.py).
"""
from __future__ import annotations

import os
import sqlite3
import sys
from functools import lru_cache
from typing import Iterable, Optional

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
for _p in (os.path.join(ROOT, "src"), os.path.join(ROOT, "scripts")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import psi_queries as q  # noqa: E402
import scenarios as sc  # noqa: E402
import build_frontend_data as bfd  # noqa: E402

LIMITATIONS = list(bfd.LIMITATIONS)
DOI = dict(bfd.DOI)  # {"FLEX": ..., "BASS-II": ...}
PROGRAM_OF_DOI = {v: k for k, v in DOI.items()}


class DataUnavailable(RuntimeError):
    """psi.sqlite no existe: la API responde 503 con el comando para regenerarla."""


def connect(db_path: Optional[str] = None) -> sqlite3.Connection:
    try:
        return q.connect(db_path) if db_path else q.connect()
    except FileNotFoundError as e:
        raise DataUnavailable(f"{e}. Run: python scripts/build_experiments.py") from e


def collect_dois(obj) -> list:
    """Unión de los source_doi que aparezcan en una respuesta (texto o lista, a cualquier profundidad)."""
    found = set()

    def walk(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == "source_doi":
                    if isinstance(v, str) and v:
                        found.add(v)
                    elif isinstance(v, list):
                        found.update(d for d in v if isinstance(d, str) and d)
                else:
                    walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)

    walk(obj)
    return sorted(found)


def envelope(payload: dict, extra_dois: Iterable[str] = ()) -> dict:
    """Agrega los campos comunes del contrato: `sources` (DOIs) y `limitations` (inglés)."""
    out = dict(payload)
    out["sources"] = sorted(set(collect_dois(payload)) | set(extra_dois))
    out["limitations"] = LIMITATIONS
    return out


@lru_cache(maxsize=4)
def precomputed(db_path: Optional[str] = None) -> dict:
    """Mismo cálculo que scripts/build_frontend_data.main(), sin escribir archivos."""
    con = connect(db_path)
    try:
        items = bfd.load(con)
        scen = bfd.build_scenarios(con)
        coverage = bfd.build_coverage(items)
        materials = bfd.build_materials(items)
        gaps = bfd.build_gaps(items, coverage, scen)
        answers = bfd.build_answers(items, scen, coverage, materials, gaps)
        return {"answers": answers, "gaps": gaps, "scenarios": scen, "coverage": coverage}
    finally:
        con.close()


def _g(x, nd=None) -> str:
    return f"{round(x, nd):g}" if nd is not None else f"{x:g}"


def site_facts(con, db_path: Optional[str] = None) -> dict:  # noqa: C901
    """Cifras para los textos "about the site": todas calculadas de los datos (nada escrito a mano)."""
    m = q.meta(con)
    n = {p["program"]: p["n"] for p in m["programs"]}
    pre = precomputed(db_path)
    scen = {s["id"]: s for s in pre["scenarios"]["scenarios"]}
    gaps = {g["id"]: g for g in pre["gaps"]["gaps"]}
    cov = pre["coverage"]
    from . import relevance as R
    rows = q.list_experiments(con, limit=q.MAX_LIMIT)["items"]
    n_complete = sum(R.is_complete(r) for r in rows)
    return {
        "n_complete": n_complete, "n_partial": len(rows) - n_complete,
        "n_complete_ai": sum(R.is_complete(r) and r["outcome_source"] == "ai_extracted" for r in rows), "n_empty_cells": cov["n_cells_empty"],
        "n_tests": sum(n.values()), "n_flex": n["FLEX"], "n_bass": n["BASS-II"],
        "doi_flex": DOI["FLEX"], "doi_bass": DOI["BASS-II"],
        "tol_o2": _g(sc.TOLERANCE["o2_fraction"] * 100, 2), "tol_psi": _g(sc.TOLERANCE["pressure_psi"]),
        "min_n": m["min_n"], "n_cells": cov["n_cells"], "n_cells_tested": cov["n_cells"] - cov["n_cells_empty"],
        "n_moon_exact": scen["lunar_challenge"]["n_exact"], "n_moon_near": scen["lunar_challenge"]["n_near"],
        "gap_psi_min": _g(gaps["low_pressure"]["evidence"]["min_psi"]),
        "gap_o2_max_pct": _g(gaps["high_oxygen"]["evidence"]["flex_o2_max"] * 100, 2),
    }
