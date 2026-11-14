#!/usr/bin/env python3
"""Rangos de O2 y presión en FLEX (NASA PSI-69, DOI 10.60555/mbq8-0451): conteos, huecos, escenarios y conciliación.

Análisis exploratorio (no es una función del producto). Solo LEE:
    data/processed/experiments.csv            (fuente única de las cifras)
    docs/material_mapping_proposal.csv         (solo para verificar afirmaciones del PDF sobre BASS-II; propuesta NO aprobada)
No escribe nada fuera de --outdir. No usa red. No imputa nulos: una presión nula va a la columna "sin_dato".

Uso:
    python scripts/analysis_rangos_o2_presion.py                       # esquema B, ±0.01 O2, ±0.5 psi
    python scripts/analysis_rangos_o2_presion.py --bands A --o2-tol 0.02 --psi-tol 0.4 --psi-tol-mode up

Reglas de interpretación (docs/03-analisis-datos.md): n siempre visible; 0<n<5 = gris (no interpretar);
% de extinción es descriptivo, no probabilidad; CO2/He confundidos con O2 (sin causalidad); "disruption" no está
definido por la fuente; sin modelo predictivo.
"""
from __future__ import annotations

import argparse
import math
import os
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import pandas as pd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CSV = os.path.join(ROOT, "data", "processed", "experiments.csv")
MAPPING = os.path.join(ROOT, "docs", "material_mapping_proposal.csv")
DEFAULT_OUT = os.path.join(ROOT, "docs", "analisis", "rangos-o2-presion")

FLEX_DOI = "10.60555/mbq8-0451"
BASS_DOI = "10.60555/4qc4-de67"
ATM_TO_PSI = 14.696
MIN_N = 5
DEC = 4  # redondeo de bordes y valores para evitar errores de coma flotante (0.21-0.01 = 0.19999999999999998)
OUTCOMES = ("extinction", "disruption", "completion")

# --------------------------------------------------------------------------- bandas de O2 (cerradas a la izquierda)
BAND_SCHEMES: Dict[str, List[float]] = {
    # A = coverage_grid.json / src/psi_queries.py:O2_BANDS (vigente)
    "A": [0.0, 0.15, 0.18, 0.21, 0.24, 1.01],
    # B = A con ">=0.24" partida en 0.28 (borde en un vacío: no hay pruebas entre 0.25 y 0.30)
    "B": [0.0, 0.15, 0.18, 0.21, 0.24, 0.28, 1.01],
    # C = alineada a escenarios: aire ±0.01 (0.20-0.22) y 26.5 % dentro de 0.22-0.28
    "C": [0.0, 0.15, 0.20, 0.22, 0.28, 1.01],
}

# --------------------------------------------------------------------------- niveles de presión
PRESSURE_GAP_ATM = 0.1          # dos presiones separadas por más de esto pertenecen a grupos distintos
LEVEL_CUTS_ATM = (0.85, 1.5)    # cortes de etiqueta; se verifica que caen en huecos sin datos
LEVELS = ("~0.7 atm", "~1.0 atm", ">2 atm")
NO_DATA = "sin_dato"


def band_labels(edges: Sequence[float]) -> List[str]:
    labels = []
    for i, (lo, hi) in enumerate(zip(edges[:-1], edges[1:])):
        if i == 0:
            labels.append(f"<{hi:.2f}")
        elif i == len(edges) - 2:
            labels.append(f">={lo:.2f}")
        else:
            labels.append(f"{lo:.2f}-{hi:.2f}")
    return labels


def assign_band(o2: pd.Series, scheme: str) -> pd.Series:
    edges = [round(e, DEC) for e in BAND_SCHEMES[scheme]]
    return pd.cut(o2.round(DEC), edges, right=False, labels=band_labels(edges))


def pressure_level(p_atm: pd.Series) -> pd.Series:
    lo, hi = LEVEL_CUTS_ATM
    out = pd.Series(NO_DATA, index=p_atm.index, dtype=object)
    out[p_atm < lo] = LEVELS[0]
    out[(p_atm >= lo) & (p_atm < hi)] = LEVELS[1]
    out[p_atm >= hi] = LEVELS[2]
    return pd.Categorical(out, categories=list(LEVELS) + [NO_DATA], ordered=True)


# --------------------------------------------------------------------------- carga
def load_experiments(path: str = CSV) -> pd.DataFrame:
    return pd.read_csv(path)


def load_flex(path: str = CSV, exp: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """FLEX (274 filas) con columnas derivadas. No imputa: presión nula queda nula y su nivel es 'sin_dato'."""
    d = (exp if exp is not None else load_experiments(path))
    f = d[d["program"] == "FLEX"].copy()
    f["o2"] = f["o2_fraction"].round(DEC)
    f["psi"] = (f["pressure_atm"] * ATM_TO_PSI).round(DEC)
    f["nivel_presion"] = pressure_level(f["pressure_atm"])
    # Sin supresor = CO2 == 0 y He == 0 explícitos. Un nulo NO cuenta como 0 (en FLEX no hay nulos; se verifica).
    f["sin_supresor"] = f["co2_fraction"].eq(0) & f["he_fraction"].eq(0)
    f["supresor"] = "none"
    f.loc[f["co2_fraction"] > 0, "supresor"] = "co2"
    f.loc[f["he_fraction"] > 0, "supresor"] = "he"
    f.loc[f["co2_fraction"].isna() | f["he_fraction"].isna(), "supresor"] = NO_DATA
    return f


# --------------------------------------------------------------------------- niveles de presión desde los datos
def detect_pressure_clusters(p_atm: pd.Series, gap: float = PRESSURE_GAP_ATM) -> pd.DataFrame:
    """Ordena las presiones no nulas y corta donde el salto entre valores consecutivos es > gap."""
    p = p_atm.dropna().sort_values().to_numpy()
    groups, start = [], 0
    for i in range(1, len(p) + 1):
        if i == len(p) or p[i] - p[i - 1] > gap:
            groups.append(p[start:i]); start = i
    rows = []
    for g in groups:
        rows.append({"atm_min": round(g[0], 4), "atm_max": round(g[-1], 4),
                     "psi_min": round(g[0] * ATM_TO_PSI, 2), "psi_max": round(g[-1] * ATM_TO_PSI, 2), "n": len(g)})
    df = pd.DataFrame(rows)
    df["nivel"] = pressure_level(df["atm_min"]).astype(str)
    df["nivel_max"] = pressure_level(df["atm_max"]).astype(str)
    df["salto_a_siguiente_atm"] = (df["atm_min"].shift(-1) - df["atm_max"]).round(4)
    return df


def pressure_levels_table(f: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for lvl in list(LEVELS) + [NO_DATA]:
        s = f[f["nivel_presion"] == lvl]
        p = s["pressure_atm"]
        rows.append({"nivel": lvl, "n": len(s),
                     "atm_min": round(p.min(), 4) if p.notna().any() else None,
                     "atm_max": round(p.max(), 4) if p.notna().any() else None,
                     "psi_min": round(p.min() * ATM_TO_PSI, 2) if p.notna().any() else None,
                     "psi_max": round(p.max() * ATM_TO_PSI, 2) if p.notna().any() else None,
                     "test_ids": ",".join(sorted(s["test_id"])) if lvl == NO_DATA else ""})
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- conteos banda × presión
def count_grid(f: pd.DataFrame, scheme: str, mask: Optional[pd.Series] = None, dedup: bool = False) -> pd.DataFrame:
    s = f if mask is None else f[mask]
    band = assign_band(s["o2"], scheme)
    cols = list(LEVELS) + [NO_DATA]
    if dedup:
        g = s.assign(banda=band).groupby(["banda", "nivel_presion"], observed=False)["test_id"].nunique()
    else:
        g = s.assign(banda=band).groupby(["banda", "nivel_presion"], observed=False).size()
    wide = g.unstack("nivel_presion").reindex(columns=cols).fillna(0).astype(int)
    wide["total"] = wide.sum(axis=1)
    wide.loc["total"] = wide.sum(axis=0)
    wide.index.name = "banda_o2"
    return wide


def cell_details(f: pd.DataFrame, scheme: str) -> pd.DataFrame:
    s = f.assign(banda=assign_band(f["o2"], scheme))
    rows = []
    for b in s["banda"].cat.categories:
        for lvl in list(LEVELS) + [NO_DATA]:
            c = s[(s["banda"] == b) & (s["nivel_presion"] == lvl)]
            n, n_clean = len(c), int(c["sin_supresor"].sum())
            rows.append({
                "esquema": scheme, "banda_o2": b, "nivel_presion": lvl,
                "n_total": n, "n_dedup": c["test_id"].nunique(), "n_sin_supresor": n_clean,
                "n_co2": int((c["supresor"] == "co2").sum()), "n_he": int((c["supresor"] == "he").sum()),
                "n_methanol": int((c["material_or_fuel"] == "methanol").sum()),
                "n_heptane": int((c["material_or_fuel"] == "heptane").sum()),
                **{f"n_{o}": int((c["outcome"] == o).sum()) for o in OUTCOMES},
                "gris_total": 0 < n < MIN_N, "gris_sin_supresor": 0 < n_clean < MIN_N,
                "hueco_n0": n == 0, "con_datos_sin_pruebas_limpias": n > 0 and n_clean == 0,
                "o2_presentes": ",".join(f"{v:g}" for v in sorted(c["o2"].unique())),
                "psi_min": round(c["psi"].min(), 2) if c["psi"].notna().any() else None,
                "psi_max": round(c["psi"].max(), 2) if c["psi"].notna().any() else None,
                "ejemplos_test_id": ",".join(sorted(c["test_id"].unique())[:5]),
                "source_doi": FLEX_DOI,
            })
    return pd.DataFrame(rows)


def counts_by_fuel(f: pd.DataFrame, scheme: str) -> pd.DataFrame:
    s = f.assign(banda=assign_band(f["o2"], scheme))
    rows = []
    for fuel in ("methanol", "heptane"):
        for b in s["banda"].cat.categories:
            for lvl in list(LEVELS) + [NO_DATA]:
                c = s[(s["material_or_fuel"] == fuel) & (s["banda"] == b) & (s["nivel_presion"] == lvl)]
                n, n_clean = len(c), int(c["sin_supresor"].sum())
                if n == 0 and lvl == NO_DATA:
                    continue
                rows.append({"esquema": scheme, "combustible": fuel, "banda_o2": b, "nivel_presion": lvl,
                             "n_total": n, "n_sin_supresor": n_clean,
                             **{f"n_{o}": int((c["outcome"] == o).sum()) for o in OUTCOMES},
                             "gris_total": 0 < n < MIN_N, "gris_sin_supresor": 0 < n_clean < MIN_N,
                             "ejemplos_test_id": ",".join(sorted(c["test_id"].unique())[:5]),
                             "source_doi": FLEX_DOI})
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- escenarios
@dataclass(frozen=True)
class Scenario:
    sid: str
    nombre: str
    o2: float
    o2_kind: str      # "point" (objetivo ± tol) | "min" (>= objetivo - tol)
    psi: float
    psi_kind: str     # "point" | "max" (<= objetivo + tol)
    fuente: str


SCENARIOS: Tuple[Scenario, ...] = (
    Scenario("S1", "Tierra/ISS: 21 % O2, 14.7 psi", 0.21, "point", 14.7, "point",
             "Aire estándar a nivel del mar (1 atm = 14.696 psi); cabina ISS ~14.7 psi (verificar cita NASA)"),
    Scenario("S2a", "Hábitat lunar (Fer): >=30 % O2, <=10.2 psi", 0.30, "min", 10.2, "max",
             "Definición de Fer SIN fuente; 30 % no es un valor NASA (verificar)"),
    Scenario("S2b", "Hábitat (NASA): 26.5 % O2, 10.2 psi", 0.265, "point", 10.2, "point",
             "NTRS 20220013669 (Surface Habitat; también atmósfera del Shuttle) - verificar"),
    Scenario("S2c", "Exploration Atmosphere: 34 % O2, 8.2 psi", 0.34, "point", 8.2, "point",
             "NTRS 20130013505 y 20150021491 (8.2 psia / 34 % O2, revisión 2012) - verificar"),
    Scenario("S3a", "Traje (Fer): 100 % O2, 4.3 psi", 1.00, "point", 4.3, "point",
             "Fer; NO confirmado (Apolo/Gemini: 5.0 psi / 100 % O2, NTRS 20220005709) - verificar"),
    Scenario("S3b", "Traje (EVA simulada NASA): 85 % O2, 4.3 psi", 0.85, "point", 4.3, "point",
             "NTRS 20220011152 - verificar"),
)

# (etiqueta, tol O2, tol psi, modo psi). "up" = la tolerancia de presión solo se aplica hacia arriba.
TOLERANCES: Tuple[Tuple[str, float, float, str], ...] = (
    ("estricto", 0.0, 0.0, "sym"),
    ("O2±0.01 psi±0.5", 0.01, 0.5, "sym"),
    ("O2±0.01 psi+0.4", 0.01, 0.4, "up"),
    ("O2±0.02 psi±0.5", 0.02, 0.5, "sym"),
    ("O2±0.02 psi+0.4", 0.02, 0.4, "up"),
)


def tol_label(o2_tol: float, psi_tol: float, mode: str) -> str:
    if o2_tol == 0 and psi_tol == 0:
        return "estricto"
    return f"O2±{o2_tol:g} psi{'±' if mode == 'sym' else '+'}{psi_tol:g}"


def scenario_bounds(sc: Scenario, o2_tol: float, psi_tol: float, mode: str):
    if sc.o2_kind == "point":
        o2_lo, o2_hi = round(sc.o2 - o2_tol, DEC), round(sc.o2 + o2_tol, DEC)
    else:
        o2_lo, o2_hi = round(sc.o2 - o2_tol, DEC), None
    if sc.psi_kind == "point":
        psi_lo = round(sc.psi - (psi_tol if mode == "sym" else 0.0), DEC)
        psi_hi = round(sc.psi + psi_tol, DEC)
    else:  # techo: la tolerancia solo puede relajar hacia arriba
        psi_lo, psi_hi = None, round(sc.psi + psi_tol, DEC)
    return o2_lo, o2_hi, psi_lo, psi_hi


def o2_mask(f: pd.DataFrame, o2_lo, o2_hi) -> pd.Series:
    m = f["o2"] >= o2_lo
    if o2_hi is not None:
        m &= f["o2"] <= o2_hi
    return m


def scenario_mask(f: pd.DataFrame, sc: Scenario, o2_tol: float, psi_tol: float, mode: str) -> pd.Series:
    o2_lo, o2_hi, psi_lo, psi_hi = scenario_bounds(sc, o2_tol, psi_tol, mode)
    m = o2_mask(f, o2_lo, o2_hi) & f["psi"].notna()   # presión nula: nunca coincide (no se imputa)
    if psi_lo is not None:
        m &= f["psi"] >= psi_lo
    m &= f["psi"] <= psi_hi
    return m


def summarize(c: pd.DataFrame) -> dict:
    n = len(c)
    return {
        "n_total": n, "n_dedup": c["test_id"].nunique(), "n_sin_supresor": int(c["sin_supresor"].sum()),
        "n_methanol": int((c["material_or_fuel"] == "methanol").sum()),
        "n_heptane": int((c["material_or_fuel"] == "heptane").sum()),
        **{f"n_{o}": int((c["outcome"] == o).sum()) for o in OUTCOMES},
        "gris": 0 < n < MIN_N,
        "o2_presentes": ",".join(f"{v:g}" for v in sorted(c["o2"].unique())),
        "psi_min": round(c["psi"].min(), 2) if n else None, "psi_max": round(c["psi"].max(), 2) if n else None,
        "test_ids": ",".join(sorted(c["test_id"].unique())) if 0 < n <= 20 else
                    (",".join(sorted(c["test_id"].unique())[:8]) + ",..." if n else ""),
    }


def nearest_condition(f: pd.DataFrame, sc: Scenario, scale_o2: float = 0.01, scale_psi: float = 0.5) -> dict:
    """Condición probada más cercana (O2 exacto × nivel de presión). Distancia en 'anchos de tolerancia'.
    NO es el escenario: solo el vecino más próximo."""
    g = f[f["psi"].notna()].groupby(["o2", "nivel_presion"], observed=True)
    best = None
    for (o2, lvl), c in g:
        d_o2 = abs(o2 - sc.o2) if sc.o2_kind == "point" else max(0.0, sc.o2 - o2)
        pmin, pmax = c["psi"].min(), c["psi"].max()
        if sc.psi_kind == "point":
            d_psi = 0.0 if pmin <= sc.psi <= pmax else min(abs(pmin - sc.psi), abs(pmax - sc.psi))
        else:
            d_psi = max(0.0, pmin - sc.psi)
        dist = math.hypot(d_o2 / scale_o2, d_psi / scale_psi)
        key = (round(dist, 6), -len(c))
        if best is None or key < best[0]:
            best = (key, o2, lvl, c, d_o2, d_psi)
    _, o2, lvl, c, d_o2, d_psi = best
    signed_o2 = round(o2 - sc.o2, 4)
    return {"vecino_condicion": f"O2 {o2:g} a {lvl}", "delta_o2_puntos_pct": round(100 * signed_o2, 1),
            "delta_psi_min": round(d_psi, 2), "distancia_en_tolerancias": round(best[0][0], 2), **summarize(c)}


def scenarios_table(f: pd.DataFrame, main: Tuple[float, float, str]) -> pd.DataFrame:
    rows = []
    variants = list(TOLERANCES)
    if tol_label(*main) not in [v[0] for v in variants]:
        variants.append((tol_label(*main),) + tuple(main))
    for sc in SCENARIOS:
        for lab, ot, pt, mode in variants:
            o2_lo, o2_hi, psi_lo, psi_hi = scenario_bounds(sc, ot, pt, mode)
            c = f[scenario_mask(f, sc, ot, pt, mode)]
            n_null_p = int((o2_mask(f, o2_lo, o2_hi) & f["psi"].isna()).sum())
            rows.append({"escenario": sc.sid, "nombre": sc.nombre, "tipo": "escenario", "tolerancia": lab,
                         "es_tolerancia_principal": lab == tol_label(*main),
                         "o2_rango": f"[{o2_lo:g}, {'∞' if o2_hi is None else f'{o2_hi:g}'}]",
                         "psi_rango": f"[{'-∞' if psi_lo is None else f'{psi_lo:g}'}, {psi_hi:g}]",
                         **summarize(c), "n_excluidas_presion_nula": n_null_p, "fuente_escenario": sc.fuente,
                         "source_doi": FLEX_DOI})
        main_n = len(f[scenario_mask(f, sc, *main)])
        if main_n == 0:
            nn = nearest_condition(f, sc)
            rows.append({"escenario": sc.sid, "nombre": sc.nombre,
                         "tipo": "vecino_mas_cercano (NO es el escenario)", "tolerancia": "no_aplica",
                         "es_tolerancia_principal": False, **nn, "fuente_escenario": sc.fuente,
                         "source_doi": FLEX_DOI})
    return pd.DataFrame(rows)


def tolerance_matrix(scen: pd.DataFrame) -> pd.DataFrame:
    s = scen[scen["tipo"] == "escenario"]
    m = s.pivot_table(index="escenario", columns="tolerancia", values="n_total", aggfunc="first")
    return m.reindex(columns=[t[0] for t in TOLERANCES] + [c for c in m.columns if c not in [t[0] for t in TOLERANCES]])


def threshold_sensitivity(f: pd.DataFrame, base_psi: float = 10.2) -> pd.DataFrame:
    rows = []
    for extra in (0.0, 0.1, 0.2, 0.3, 0.4, 0.5):
        m = f["psi"].notna() & (f["psi"] <= round(base_psi + extra, DEC))
        rows.append({"umbral_psi": round(base_psi + extra, 2), "n_todas": int(m.sum()),
                     "n_o2_ge_0.30": int((m & (f["o2"] >= 0.30)).sum()),
                     "n_o2_ge_0.30_sin_supresor": int((m & (f["o2"] >= 0.30) & f["sin_supresor"]).sum())})
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- comparación de esquemas (T5)
def coverage_grid_cells(f: pd.DataFrame, scheme: str) -> Tuple[int, int]:
    """Réplica de la agrupación de flex_coverage_grid (combustible × banda × presión 0.1 atm × supresor)."""
    s = f.assign(banda=assign_band(f["o2"], scheme),
                 p01=f["pressure_atm"].round(1).astype(object).where(f["pressure_atm"].notna(), "unknown"))
    g = s.groupby(["material_or_fuel", "banda", "p01", "supresor"], observed=True).size()
    return len(g), int((g < MIN_N).sum())


def scheme_alignment(f: pd.DataFrame, scheme: str, sc: Scenario, o2_tol: float) -> str:
    """¿El conjunto de pruebas del escenario (solo eje O2) es exactamente una unión de bandas completas?"""
    o2_lo, o2_hi, _, _ = scenario_bounds(sc, o2_tol, 0, "sym")
    inside = o2_mask(f, o2_lo, o2_hi)
    if not inside.any():
        return "no_aplica (0 pruebas con ese O2)"
    band = assign_band(f["o2"], scheme)
    touched = set(band[inside])
    ok = bool(inside[band.isin(touched)].all())
    return ("si" if ok else "no") + f" (bandas: {', '.join(sorted(map(str, touched)))})"


def compare_schemes(f: pd.DataFrame, o2_tol: float) -> pd.DataFrame:
    impact = {
        "A": "Vigente: ningún cambio (coverage_grid.json, psi_queries.O2_BANDS, /coverage, /gaps).",
        "B": "Cambia solo la última banda (>=0.24 -> 0.24-0.28 y >=0.28): psi_queries.O2_BANDS, coverage_grid.json "
             "(regenerar), mapa de Charly (1 columna más), /coverage y /gaps (nuevas celdas), data-dictionary.",
        "C": "Cambian 3 de 5 bordes y todas las etiquetas salvo <0.15: psi_queries.O2_BANDS, coverage_grid.json, "
             "mapa y tabla de Charly, /coverage, /gaps, docs/07 (ejemplo '0.21-0.24'), data-dictionary.",
    }
    rows = []
    for sch in ("A", "B", "C"):
        det = cell_details(f, sch)
        det3 = det[det["nivel_presion"] != NO_DATA]
        cg_cells, cg_small = coverage_grid_cells(f, sch)
        rows.append({
            "esquema": sch, "bordes": ",".join(f"{e:g}" for e in BAND_SCHEMES[sch]),
            "bandas": " | ".join(band_labels(BAND_SCHEMES[sch])),
            "celdas_banda_x_presion": len(det3), "celdas_n0": int(det3["hueco_n0"].sum()),
            "celdas_gris_0<n<5": int(det3["gris_total"].sum()),
            "celdas_con_datos_sin_limpias": int(det3["con_datos_sin_pruebas_limpias"].sum()),
            "celdas_sin_supresor_gris_0<n<5": int(det3["gris_sin_supresor"].sum()),
            "celdas_coverage_grid_equivalente": cg_cells, "celdas_coverage_grid_n<5": cg_small,
            **{f"alineado_{sc.sid}": scheme_alignment(f, sch, sc, o2_tol) for sc in SCENARIOS[:4]},
            "a_quien_afecta": impact[sch],
        })
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- Charly (T3)
CHARLY_EDGES = [0.0, 0.15, 0.21, 0.3, 1.01]  # pd.cut por defecto: cerradas a la DERECHA
CHARLY_EXPECTED = {  # (combustible, banda): (n, n_tasa, tasa_media, tmin, tmax, n_diam, diam_medio, n_co2_he, n_ext)
    ("heptane", "(0.0, 0.15]"): (11, 9, 0.494, 0.24, 0.94, 5, 3.7, 0, 8),
    ("heptane", "(0.15, 0.21]"): (73, 68, 0.517, 0.05, 1.06, 44, 2.474, 48, 45),
    ("heptane", "(0.21, 0.3]"): (29, 27, 0.603, 0.34, 0.85, 7, 3.034, 22, 7),
    ("heptane", "(0.3, 1.01]"): (4, 3, 0.81, 0.73, 0.9, 0, None, 0, 0),
    ("methanol", "(0.0, 0.15]"): (37, 36, 0.378, 0.2, 0.58, 33, 2.201, 15, 37),
    ("methanol", "(0.15, 0.21]"): (85, 80, 0.469, 0.27, 0.7, 60, 1.8, 66, 76),
    ("methanol", "(0.21, 0.3]"): (30, 30, 0.56, 0.42, 0.74, 10, 1.375, 22, 13),
    ("methanol", "(0.3, 1.01]"): (5, 5, 0.654, 0.53, 0.72, 0, None, 0, 0),
}
CHARLY_COLS = ["n_pruebas", "n_con_tasa", "tasa_media_mm2_s", "tasa_min", "tasa_max", "n_con_diametro",
               "diam_extincion_medio_mm", "pruebas_con_CO2_o_He", "pruebas_extincion"]


def _charly_stats(c: pd.DataFrame) -> dict:
    k = c["burning_rate_mm2_s"]
    dext = c["extinction_diameter_mm"]  # en experiments.csv solo existe si outcome = extinction
    return {"n_pruebas": len(c), "n_con_tasa": int(k.notna().sum()),
            "tasa_media_mm2_s": round(k.mean(), 3) if k.notna().any() else None,
            "tasa_min": k.min() if k.notna().any() else None, "tasa_max": k.max() if k.notna().any() else None,
            "n_con_diametro": int(dext.notna().sum()),
            "diam_extincion_medio_mm": round(dext.mean(), 3) if dext.notna().any() else None,
            "pruebas_con_CO2_o_He": int((~c["sin_supresor"]).sum()),
            "pruebas_extincion": int((c["outcome"] == "extinction").sum()),
            "gris_n_menor_5": len(c) < MIN_N, "fragil_n_menor_10": len(c) < 10}


def charly_reconciliation(f: pd.DataFrame, scheme: str) -> pd.DataFrame:
    rows = []
    # (a) reproducción con sus bandas (cerradas a la derecha)
    cb = pd.cut(f["o2"], CHARLY_EDGES, right=True)
    for fuel in ("heptane", "methanol"):
        for b in cb.cat.categories:
            c = f[(f["material_or_fuel"] == fuel) & (cb == b)]
            st = _charly_stats(c)
            exp = CHARLY_EXPECTED.get((fuel, str(b)))
            match = None
            if exp is not None:
                got = [st[k] for k in CHARLY_COLS]
                match = all((e is None and g is None) or (e is not None and g is not None and abs(float(e) - float(g)) < 0.0015)
                            for e, g in zip(exp, got))
            rows.append({"version": "a_charly_reproducida_cerrada_derecha", "combustible": fuel, "banda": str(b),
                         "nivel_presion": "todas", "solo_sin_supresor": False, **st,
                         "coincide_con_charly": match, "o2_presentes": ",".join(f"{v:g}" for v in sorted(c["o2"].unique()))})
    # (b) mismas métricas con bandas cerradas a la izquierda: A (coverage_grid) y el esquema elegido
    for sch in sorted({"A", scheme}):
        band = assign_band(f["o2"], sch)
        for fuel in ("heptane", "methanol"):
            for b in band.cat.categories:
                c = f[(f["material_or_fuel"] == fuel) & (band == b)]
                rows.append({"version": f"b_esquema_{sch}_cerrada_izquierda", "combustible": fuel, "banda": b,
                             "nivel_presion": "todas", "solo_sin_supresor": False, **_charly_stats(c),
                             "o2_presentes": ",".join(f"{v:g}" for v in sorted(c["o2"].unique()))})
    # (c) estratificada: solo sin supresor y por nivel de presión (para que la tasa media sea comparable)
    band = assign_band(f["o2"], scheme)
    for fuel in ("heptane", "methanol"):
        for b in band.cat.categories:
            for lvl in LEVELS:
                c = f[(f["material_or_fuel"] == fuel) & (band == b) & (f["nivel_presion"] == lvl) & f["sin_supresor"]]
                rows.append({"version": f"c_estratificada_esquema_{scheme}_sin_supresor", "combustible": fuel,
                             "banda": b, "nivel_presion": lvl, "solo_sin_supresor": True, **_charly_stats(c),
                             "o2_presentes": ",".join(f"{v:g}" for v in sorted(c["o2"].unique()))})
    out = pd.DataFrame(rows)
    out["source_doi"] = FLEX_DOI
    return out


def charly_band_changes(f: pd.DataFrame) -> pd.DataFrame:
    """Pruebas cuyo O2 cae en un borde de Charly (0.15, 0.21, 0.30): cambian de banda según la convención."""
    s = f[f["o2"].isin([0.15, 0.21, 0.30])].copy()
    s["banda_charly_derecha"] = pd.cut(s["o2"], CHARLY_EDGES, right=True).astype(str)
    s["banda_charly_izquierda"] = pd.cut(s["o2"], CHARLY_EDGES, right=False).astype(str)
    for sch in ("A", "B"):
        s[f"banda_{sch}"] = assign_band(s["o2"], sch).astype(str)
    g = (s.groupby(["o2", "banda_charly_derecha", "banda_charly_izquierda", "banda_A", "banda_B"])
         .agg(n=("test_id", "size"), test_ids=("test_id", lambda x: ",".join(sorted(x))))
         .reset_index())
    return g


# --------------------------------------------------------------------------- PDF (T4)
def pdf_claims(exp: pd.DataFrame, f: pd.DataFrame, mapping_path: str = MAPPING) -> pd.DataFrame:
    rows: List[dict] = []

    def add(sec, claim, v_pdf, v_csv, note="", coincide=None):
        if coincide is None:
            coincide = "si" if str(v_pdf) == str(v_csv) else "no"
        rows.append({"seccion": sec, "afirmacion": claim, "valor_pdf": v_pdf, "valor_csv": v_csv,
                     "coincide": coincide, "nota": note})

    fuel = f["material_or_fuel"]
    near1 = f["nivel_presion"] == "~1.0 atm"
    near07 = f["nivel_presion"] == "~0.7 atm"
    clean = f["sin_supresor"]
    vc = lambda m: f"{int((m & (fuel == 'methanol')).sum())}/{int((m & (fuel == 'heptane')).sum())}"  # noqa: E731
    oc = lambda m, o: int((m & (f["outcome"] == o)).sum())  # noqa: E731

    add("3", "Pruebas FLEX metanol/heptano", "160/114", vc(pd.Series(True, index=f.index)),
        "El crudo PSI-69 da 157/117 según docs/VERIFICACION.md A4.1 (verificado el 14 nov con data/raw).")
    for fu, pdfv in (("methanol", (124, 26, 10)), ("heptane", (57, 42, 15))):
        m = fuel == fu
        add("3", f"{fu}: extinction/disruption/completion", "/".join(map(str, pdfv)),
            "/".join(str(oc(m, o)) for o in OUTCOMES), "Totales globales CSV: 186/61/27 (VERIFICACION A4.1).")
    allm = pd.Series(True, index=f.index)
    add("3", "Total FLEX extinction/disruption/completion (suma de las cifras del PDF)", "181/68/25",
        "/".join(str(oc(allm, o)) for o in OUTCOMES),
        "No es solo un cambio de combustible: también difieren los totales por resultado (ambos suman 274).")
    # 7.1 aire normal
    air_exact = (f["o2"] == 0.21) & near1 & clean
    air_tol = f["o2"].between(0.20, 0.22) & near1 & clean
    add("7.1", "Aire ~21 % O2, ~1 atm, sin supresor (n metanol/heptano)", "10/12",
        f"{vc(air_exact)} (O2=0.21) ; {vc(air_tol)} (O2 0.20-0.22)",
        "Ninguna definición razonable da 10/12. Fer: 29 limpias con ±0.01.")
    add("7.1", "Aire: metanol se extingue", "8/10",
        f"{oc(air_exact & (fuel == 'methanol'), 'extinction')}/{int((air_exact & (fuel == 'methanol')).sum())} (O2=0.21) ; "
        f"{oc(air_tol & (fuel == 'methanol'), 'extinction')}/{int((air_tol & (fuel == 'methanol')).sum())} (0.20-0.22)",
        "Descriptivo, no probabilidad.")
    hm = fuel == "heptane"
    add("7.1", "Aire: heptano disruption / completion", "7/12 ; 3/12",
        f"{oc(air_exact & hm, 'disruption')}/{int((air_exact & hm).sum())} ; {oc(air_exact & hm, 'completion')}/{int((air_exact & hm).sum())} (O2=0.21) ; "
        f"{oc(air_tol & hm, 'disruption')}/{int((air_tol & hm).sum())} ; {oc(air_tol & hm, 'completion')}/{int((air_tol & hm).sum())} (0.20-0.22)",
        "'Disruption' no está definido por la fuente.")
    lun = f["o2"].between(0.30, 0.34) & near07
    k = f.loc[lun, "burning_rate_mm2_s"]
    add("7.1", "'Base lunar/rover' 30-34 % O2 ~0.70 atm (metanol/heptano)", "11/8", vc(lun),
        f"Total CSV {int(lun.sum())}; todas sin supresor: {int((lun & clean).sum())}.")
    add("7.1", "'Base lunar' resultados disruption + completion (extinction)", "15 + 4 (0)",
        f"{oc(lun, 'disruption')} + {oc(lun, 'completion')} ({oc(lun, 'extinction')})", "")
    add("7.1", "'Base lunar' rango de tasas mm2/s", "0.53-0.90", f"{k.min():g}-{k.max():g} (n con tasa={k.notna().sum()})",
        "Coincide el rango aunque difiere el n.", coincide="si" if (k.min(), k.max()) == (0.53, 0.90) else "no")
    o30 = (f["o2"] == 0.30) & near1
    ext30 = sorted(f.loc[o30 & (f["outcome"] == "extinction"), "test_id"])
    add("7.1", "30 % O2 ~1 atm (metanol/heptano)", "4/3", vc(o30), "")
    add("7.1", "30 % O2 ~1 atm: extinciones", "1 (206R001)", f"{len(ext30)} ({', '.join(ext30)})",
        "El PDF omite 178F001 (metanol, O2 0.30, 1.0121 atm, extinction).")
    co2 = f["co2_fraction"] > 0
    he = f["he_fraction"] > 0
    add("7.1", "CO2 0.05-0.70 (metanol/heptano)", "78/51", vc(co2),
        f"Rango CSV {f.loc[co2, 'co2_fraction'].min():g}-{f.loc[co2, 'co2_fraction'].max():g}; total {int(co2.sum())}.")
    add("7.1", "He 0.05-0.45 (metanol/heptano)", "36/24", vc(he),
        f"Rango CSV {f.loc[he, 'he_fraction'].min():g}-{f.loc[he, 'he_fraction'].max():g}; total {int(he.sum())}. "
        f"CO2 y He juntos: {int((co2 & he).sum())}.")
    hyp = f["o2"].between(0.12, 0.20) & clean
    add("7.1", "'Hipoxia' 12-20 % O2 sin supresor (metanol/heptano)", "21/16",
        f"{vc(hyp)} (cualquier presión) ; {vc(hyp & near1)} (~1 atm) ; {vc(f['o2'].between(0.12, 0.19) & clean)} (0.12-0.19)",
        "Definición de presión no dada en el PDF.")
    # BASS-II
    b = exp[exp["program"] == "BASS-II"]
    stated = b["outcome"].notna()
    add("BASS-II", "Pruebas BASS-II", 129, len(b), "")
    add("BASS-II", "Pruebas con resultado (extraído por IA)", 26, int(stated.sum()),
        "outcome_source = ai_extracted; las 103 restantes son not_stated (≠ 'no se extinguió').")
    ni = b[b["outcome"] == "no_ignition"]
    add("BASS-II", "no_ignition: 1 (varilla transparente 3/8\", O2 13.6 %)", "1; 3/8\" clear rod; 13.6 %",
        f"{len(ni)}; {'; '.join(ni['material_or_fuel'])}; {'; '.join(f'{v * 100:.1f} %' for v in ni['o2_fraction'])}",
        f"Prueba {', '.join(ni['test_id'])}.", coincide="si" if len(ni) == 1 and abs(ni['o2_fraction'].iloc[0] - 0.136) < 1e-9 else "no")
    if os.path.exists(mapping_path):
        mp = pd.read_csv(mapping_path)
        cat = {}
        for _, r in mp.iterrows():
            for t in str(r["test_ids"]).split(","):
                cat[t.strip()] = r["proposed_category"]
        bc = b["test_id"].map(cat)
        grp = {"varillas": ["pmma_rod"], "telas/esferas": ["cotton_fiberglass_fabric", "aramid_fabric", "pmma_sphere"],
               "películas": ["pmma_thin_film"], "placas": ["pmma_thick_sheet"], "vela": ["wax_candle"]}
        csv_cat = {g: int(bc.isin(v).sum()) for g, v in grp.items()}
        add("BASS-II", "Categorías: varillas/telas+esferas/películas/placas/vela", "54/32/22/20/1",
            "/".join(str(csv_cat[g]) for g in grp),
            "Usa docs/material_mapping_proposal.csv, que NO está aprobada (material_category es null en experiments.csv). "
            "Telas+esferas mezcla tela (27 SIBAL + 3 Nomex) con 2 esferas de PMMA.")
        with_out = {g: int((bc.isin(v) & stated).sum()) for g, v in grp.items()}
        add("BASS-II", "Con resultado: varillas/películas/placa", "21/4/1",
            f"{with_out['varillas']}/{with_out['películas']}/{with_out['placas']}", "Misma propuesta no aprobada.")
        add("Conclusión", "SIBAL, Nomex, esferas y vela 'sin determinar'", "sin resultado declarado",
            f"pruebas con resultado declarado en telas+esferas/vela: {with_out['telas/esferas']}/{with_out['vela']}",
            "Coincide: 0 pruebas con resultado; not_stated ≠ 'no se extinguió' ni 'no ardió'.",
            coincide="si" if with_out["telas/esferas"] == 0 and with_out["vela"] == 0 else "no")
    else:
        add("BASS-II", "Categorías de material", "54/32/22/20/1", "sin dato", "Falta docs/material_mapping_proposal.csv",
            coincide="no_verificable")
    so = b.loc[stated, "outcome"].value_counts()
    add("Conclusión", "Ningún material 'no inflamable' demostrado", "ninguno demostrado",
        "ninguno demostrado: " + ", ".join(f"{k} {v}" for k, v in so.items()) + " (de 26 con resultado)",
        "Consistente con el CSV. Solo O12 no encendió (1 prueba, 1 condición): no basta para 'no inflamable'. "
        "No usar etiqueta binaria; lo defendible es 'ignición observada en >=1 prueba' por condición.",
        coincide="si")
    add("Origen", "El PDF dice salir de la tabla cruda PSI-69", "tabla cruda", "data/raw/ no existe en este disco",
        "Pendiente: comparar con 'PSI-69_Experimental table_FLEX.csv' (ver informe, comando exacto).",
        coincide="no_verificable")
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- verificaciones (Yael 3.1, Fer 3.2)
YAEL_31 = {  # esquema B: banda -> (~0.7, ~1.0, >2, sin_dato, total)
    "<0.15": (0, 28, 0, 0, 28), "0.15-0.18": (15, 36, 0, 0, 51), "0.18-0.21": (25, 47, 0, 1, 73),
    "0.21-0.24": (30, 34, 9, 0, 73), "0.24-0.28": (16, 9, 0, 0, 25), ">=0.28": (17, 7, 0, 0, 24),
    "total": (103, 161, 9, 1, 274),
}
YAEL_31_CLEAN = {"<0.15": (0, 23, 0), "0.15-0.18": (0, 13, 0), "0.18-0.21": (5, 7, 0), "0.21-0.24": (0, 29, 0),
                 "0.24-0.28": (0, 0, 0), ">=0.28": (17, 7, 0)}


def verifications(f: pd.DataFrame, scen: pd.DataFrame) -> pd.DataFrame:
    rows = []

    def add(cid, desc, esperado, csv, nota=""):
        rows.append({"id": cid, "descripcion": desc, "valor_esperado": esperado, "valor_csv": csv,
                     "coincide": "si" if str(esperado) == str(csv) else "no", "nota": nota})

    tot = count_grid(f, "B")
    for b, exp in YAEL_31.items():
        got = tuple(int(tot.loc[b, c]) for c in list(LEVELS) + [NO_DATA, "total"])
        add(f"Y31-{b}", f"Tabla 3.1 Yael, banda {b} (~0.7/~1.0/>2/sin_dato/total)", exp, got)
    cl = count_grid(f, "B", f["sin_supresor"])
    for b, exp in YAEL_31_CLEAN.items():
        add(f"Y31c-{b}", f"Tabla 3.1 Yael sin supresor, banda {b} (~0.7/~1.0/>2)", exp,
            tuple(int(cl.loc[b, c]) for c in LEVELS))
    add("Y31c-total", "Sin supresor total", 101, int(f["sin_supresor"].sum()))
    s = scen[scen["tipo"] == "escenario"].set_index(["escenario", "tolerancia"])
    add("F-S1", "Fer: Tierra ±0.01/±0.5 psi n", 49, int(s.loc[("S1", "O2±0.01 psi±0.5"), "n_total"]))
    add("F-S1c", "Fer: Tierra ±0.01/±0.5 psi sin supresor", 29, int(s.loc[("S1", "O2±0.01 psi±0.5"), "n_sin_supresor"]))
    add("F-S1-02", "Fer: Tierra ±0.02 en O2 (±0.5 psi)", 56, int(s.loc[("S1", "O2±0.02 psi±0.5"), "n_total"]),
        "O2 0.19-0.23 a ~1 atm.")
    add("F-S2a-estricto", "Fer: lunar >=30 % y <=10.2 psi sin tolerancia", 0, int(s.loc[("S2a", "estricto"), "n_total"]))
    add("F-S2a-tol", "Fer: lunar con la MISMA tolerancia que Tierra (±0.01/±0.5)", 0,
        int(s.loc[("S2a", "O2±0.01 psi±0.5"), "n_total"]), "Inconsistencia: con la misma tolerancia no es 0.")
    for lab, lo, hi, exp in (("10.2-10.5 psi", 10.2, 10.5, 103), ("14.5-15.0 psi", 14.5, 15.0, 161), ("30-45 psi", 30, 45, 9)):
        add(f"F-P-{lab}", f"Fer: rango de presión {lab}", exp, int(f["psi"].between(lo, hi).sum()),
            f"Rango real del nivel: ver niveles_presion.csv.")
    for tid, o2, atm in (("178F001", 0.30, 1.0121), ("196F001", 0.34, 0.7093)):
        r = f[f["test_id"] == tid].iloc[0]
        add(f"F-row-{tid}", f"Fila {tid}: O2, atm", f"{o2:g}, {atm:g}", f"{r['o2']:g}, {r['pressure_atm']:g}",
            f"{r['material_or_fuel']}, {r['outcome']}, nivel {r['nivel_presion']}")
    r = f[f["test_id"] == "C11M201"].iloc[0]
    add("F-row-C11M201", "C11M201 sin presión -> 'sin_dato'", NO_DATA, str(r["nivel_presion"]),
        f"qc_flags={r['qc_flags']}; O2 {r['o2']:g}, {r['material_or_fuel']}, {r['outcome']}")
    d = f[f["test_id"] == "193F001"]
    add("dup-193F001", "193F001 filas / condiciones distintas", "2 / 1",
        f"{len(d)} / {len(d[['o2', 'pressure_atm', 'co2_fraction', 'he_fraction']].drop_duplicates())}",
        f"Ambas en O2 {d['o2'].iloc[0]:g}, {d['pressure_atm'].iloc[0]:g} atm; se cuentan ambas (n) y se informa n_dedup.")
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- main
def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--o2-tol", type=float, default=0.01, help="tolerancia de O2 (fracción), por defecto 0.01")
    ap.add_argument("--psi-tol", type=float, default=0.5, help="tolerancia de presión en psi, por defecto 0.5")
    ap.add_argument("--psi-tol-mode", choices=["sym", "up"], default="sym",
                    help="sym = ±tol; up = solo hacia arriba (+tol)")
    ap.add_argument("--bands", choices=sorted(BAND_SCHEMES), default="B", help="esquema de bandas de O2")
    ap.add_argument("--outdir", default=DEFAULT_OUT)
    ap.add_argument("--csv", default=CSV, help=argparse.SUPPRESS)
    return ap.parse_args(argv)


def run(args) -> Dict[str, pd.DataFrame]:
    exp = load_experiments(args.csv)
    f = load_flex(exp=exp)
    main = (args.o2_tol, args.psi_tol, args.psi_tol_mode)
    out = {
        "niveles_presion": pressure_levels_table(f),
        "grupos_presion_detectados": detect_pressure_clusters(f["pressure_atm"]),
        "conteos_total": count_grid(f, args.bands),
        "conteos_total_dedup": count_grid(f, args.bands, dedup=True),
        "conteos_sin_supresor": count_grid(f, args.bands, f["sin_supresor"]),
        "celdas_detalle": cell_details(f, args.bands),
        "conteos_por_combustible": counts_by_fuel(f, args.bands),
    }
    scen = scenarios_table(f, main)
    out["escenarios"] = scen
    out["matriz_tolerancia_escenario"] = tolerance_matrix(scen)
    out["sensibilidad_umbral_10_2psi"] = threshold_sensitivity(f)
    out["comparacion_bandas"] = compare_schemes(f, args.o2_tol)
    out["charly_conciliacion"] = charly_reconciliation(f, args.bands)
    out["charly_cambios_de_banda"] = charly_band_changes(f)
    out["afirmaciones_pdf"] = pdf_claims(exp, f)
    out["verificaciones"] = verifications(f, scen)
    out["_flex"] = f
    return out


def main(argv=None) -> int:
    args = parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):  # consola de Windows (cp1252) no imprime ± ni ≤
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    res = run(args)
    f = res.pop("_flex")
    os.makedirs(args.outdir, exist_ok=True)
    keep_index = {"conteos_total", "conteos_total_dedup", "conteos_sin_supresor", "matriz_tolerancia_escenario"}
    for name, df in res.items():
        df.to_csv(os.path.join(args.outdir, f"{name}.csv"), index=name in keep_index, encoding="utf-8")

    pd.set_option("display.width", 200)
    print(f"FLEX (PSI-69, DOI {FLEX_DOI}) — esquema {args.bands}, tolerancia {tol_label(args.o2_tol, args.psi_tol, args.psi_tol_mode)}")
    print("\nGrupos de presión detectados (saltos > %.2f atm):" % PRESSURE_GAP_ATM)
    print(res["grupos_presion_detectados"].to_string(index=False))
    print("\nNiveles usados:")
    print(res["niveles_presion"].to_string(index=False))
    print("\nConteos total (n):"); print(res["conteos_total"].to_string())
    print("\nConteos sin supresor (CO2 = 0 y He = 0):"); print(res["conteos_sin_supresor"].to_string())
    print("\nMatriz tolerancia × escenario (n_total):"); print(res["matriz_tolerancia_escenario"].to_string())
    v = res["verificaciones"]
    print("\nVerificaciones que NO coinciden:")
    print(v[v["coincide"] == "no"][["id", "valor_esperado", "valor_csv"]].to_string(index=False) or "(ninguna)")

    # Bloque de verificación
    tot = res["conteos_total"]
    cells_sum = int(tot.drop(index="total").drop(columns="total").to_numpy().sum())
    clean = res["conteos_sin_supresor"]
    print("\n== VERIFICACIÓN ==")
    print(f"Suma de celdas (banda × presión, incl. sin_dato) = {cells_sum}  (filas FLEX = {len(f)})")
    print(f"n deduplicado (test_id únicos) = {f['test_id'].nunique()}  (193F001 aparece 2 veces)")
    print(f"Sin supresor = {int(clean.loc['total', 'total'])} ≤ total = {int(tot.loc['total', 'total'])}")
    ok = cells_sum == len(f) == 274 and (clean.to_numpy() <= tot.to_numpy()).all()
    print("OK" if ok else "FALLO")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
