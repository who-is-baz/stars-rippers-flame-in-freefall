#!/usr/bin/env python3
"""Resumen único del equipo (parte de Baz): escenarios, O2 × presión, combustible estratificado y BASS-II por material.

Reutiliza scripts/analysis_rangos_o2_presion.py (análisis de Yael); no duplica su lógica. Solo LEE:
    data/processed/experiments.csv          FLEX (PSI-69, DOI 10.60555/mbq8-0451) y BASS-II (PSI-25, DOI 10.60555/4qc4-de67)
    docs/material_mapping_proposal.csv      categorías de material de BASS-II (en main: propuesta; ver nota en T4)
Escribe solo en --outdir (CSV + tablas.txt de ancho fijo para pegar en el chat). Sin red. No imputa nulos.

Uso:  python scripts/analysis_resumen_equipo.py [--outdir docs/analisis/resumen-equipo]
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Dict, List

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analysis_rangos_o2_presion as yr  # noqa: E402  (lógica de Yael: bandas, niveles, tolerancias, vecino)

ROOT = yr.ROOT
DEFAULT_OUT = os.path.join(ROOT, "docs", "analisis", "resumen-equipo")
SCHEME = "B"                      # bandas unificadas: <0.15, 0.15-0.18, 0.18-0.21, 0.21-0.24, 0.24-0.28, >=0.28
MAIN_TOL = (0.01, 0.5, "sym")     # ±0.01 O2, ±0.5 psi, la MISMA para todos los escenarios
BASS_OUTCOMES = ("extinction", "blowoff", "no_ignition", "not_sustained")
GRIS = "gris (n<5)"
NO_DATA_TXT = "sin dato"

# Escenarios unificados. Las fuentes NASA se verificaron el 14 nov (ver escenario_marte.md); la de Fer no tiene fuente.
SCENARIOS: List[yr.Scenario] = [
    yr.Scenario("E1", "Tierra/ISS: 21 % O2, 14.7 psi", 0.21, "point", 14.7, "point",
                "Aire estándar (1 atm = 14.696 psi). NTRS 20230009095 p.7/p.27: '14.7 psia (21% O2)' (tránsito a Marte)"),
    yr.Scenario("E2", "Hábitat NASA: 26.5 % O2, 10.2 psi", 0.265, "point", 10.2, "point",
                "NTRS 20230009095 p.7/p.27: '10.2 psia (26.5% O2) atmosphere for Gateway ops' (verificado)"),
    yr.Scenario("E3", "Exploración NASA / Marte: 34 % O2, 8.2 psi", 0.34, "point", 8.2, "point",
                "NTRS 20220015741 (8.2 psia, 34% O2; Luna y Marte); NTRS 20230009095 p.16 (Marte superficie 8.2 psia, "
                "sin % O2); NTRS 20170001585 p.4 (cabina MAV) (verificado)"),
    yr.Scenario("E4", "Traje NASA (EVA simulada): 85 % O2, 4.3 psi", 0.85, "point", 4.3, "point",
                "NTRS 20220015741: '4.3 psia at 85% O2 for simulated EVAs' (verificado)"),
    yr.Scenario("E5", "Traje (texto del reto / Fer): 100 % O2, 4.3 psi", 1.00, "point", 4.3, "point",
                "Texto oficial del reto (docs/08): 'spacesuits are filled with 100% oxygen to only 4.3 psi'. "
                "No está en los NTRS revisados (20220015741 usa 85 % O2 a 4.3 psia en EVA simulada)"),
    yr.Scenario("R1", "Hábitat lunar (texto del reto / Fer): >=30 % O2, <=10.2 psi", 0.30, "min", 10.2, "max",
                "Texto oficial del reto (docs/08): 'likely be 30% or greater ... 10.2 psi or less' (estimación, "
                "no un documento técnico NTRS). Fer la tomó de ahí"),
]


def _fmt_rate(st: dict) -> object:
    return st["tasa_media_mm2_s"] if st["n_pruebas"] >= yr.MIN_N else (GRIS if st["n_pruebas"] else NO_DATA_TXT)


# --------------------------------------------------------------------------- T1 escenarios
def t1_scenarios(f: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for sc in SCENARIOS:
        c = f[yr.scenario_mask(f, sc, *MAIN_TOL)]
        s = yr.summarize(c)
        row = {"escenario": sc.sid, "nombre": sc.nombre, "tipo": "escenario", **s,
               "estado": NO_DATA_TXT if s["n_total"] == 0 else (GRIS if s["gris"] else "ok"),
               "fuente_escenario": sc.fuente, "source_doi": yr.FLEX_DOI}
        rows.append(row)
        if s["n_total"] == 0:
            nn = yr.nearest_condition(f, sc)
            rows.append({"escenario": sc.sid, "nombre": sc.nombre, "tipo": "vecino_mas_cercano (NO es el escenario)",
                         **nn, "estado": "vecino", "fuente_escenario": sc.fuente, "source_doi": yr.FLEX_DOI})
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- T3 combustible estratificado
def t3_fuel_stratified(f: pd.DataFrame) -> pd.DataFrame:
    band = yr.assign_band(f["o2"], SCHEME)
    rows = []
    for fuel in ("methanol", "heptane"):
        for b in band.cat.categories:
            for lvl in yr.LEVELS:
                c = f[(f["material_or_fuel"] == fuel) & (band == b) & (f["nivel_presion"] == lvl) & f["sin_supresor"]]
                st = yr._charly_stats(c)
                rows.append({"combustible": fuel, "banda_o2": b, "nivel_presion": lvl, "n": st["n_pruebas"],
                             "n_con_tasa": st["n_con_tasa"], "tasa_media_mm2_s": _fmt_rate(st),
                             **{f"n_{o}": int((c["outcome"] == o).sum()) for o in yr.OUTCOMES},
                             "gris": 0 < st["n_pruebas"] < yr.MIN_N,
                             "ejemplos_test_id": ",".join(sorted(c["test_id"].unique())[:4]),
                             "source_doi": yr.FLEX_DOI})
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- T4 BASS-II por material
def load_mapping(path: str = yr.MAPPING) -> pd.DataFrame:
    mp = pd.read_csv(path)
    rows = []
    for _, r in mp.iterrows():
        for t in str(r["test_ids"]).split(","):
            rows.append({"test_id": t.strip(), "categoria": r["proposed_category"],
                         "color": r["color"] if isinstance(r["color"], str) else None})
    return pd.DataFrame(rows)


def t4_bass(exp: pd.DataFrame, mapping_path: str = yr.MAPPING) -> pd.DataFrame:
    b = exp[exp["program"] == "BASS-II"].merge(load_mapping(mapping_path), on="test_id", how="left")
    groups = [(cat, None, b[b["categoria"] == cat]) for cat in sorted(b["categoria"].dropna().unique())]
    # Varillas por color (Fer, #3: no mezclar negras y transparentes al comparar). Solo conteos.
    for col in ("black", "clear"):
        groups.append(("pmma_rod", col, b[(b["categoria"] == "pmma_rod") & (b["color"] == col)]))
    groups.append(("(sin categoría)", None, b[b["categoria"].isna()]))
    groups.append(("TOTAL", None, b))
    rows = []
    for cat, col, c in groups:
        if cat == "(sin categoría)" and c.empty:
            continue
        n = len(c)
        stated = c["outcome_source"].eq("ai_extracted")
        rows.append({
            "categoria_propuesta": cat, "color": col or "", "n_total": n,
            "n_con_resultado_ai_extracted": int(stated.sum()),
            "n_not_stated": int(c["outcome_source"].eq("not_stated").sum()),
            **{f"n_{o}": int((c["outcome"] == o).sum()) for o in BASS_OUTCOMES},
            "ignicion_observada_en_>=1_prueba": "si" if (c["outcome"].isin(["extinction", "blowoff", "not_sustained"])).any()
                                                else "sin dato (ningún resultado declarado)" if not stated.any() else "no observada",
            "n_low_confidence": int(c["qc_flags"].fillna("").str.contains("low_confidence").sum()),
            "o2_inicial_min_pct": round(100 * c["o2_fraction"].min(), 1) if c["o2_fraction"].notna().any() else None,
            "o2_inicial_max_pct": round(100 * c["o2_fraction"].max(), 1) if c["o2_fraction"].notna().any() else None,
            "gris": 0 < n < yr.MIN_N,
            "ejemplos_test_id": ",".join(sorted(c["test_id"])[:5]),
            "limitacion": "sin presión registrada; O2 medido (no fijado), máx 22.2 %; resultado extraído por IA (ai_*); "
                          "not_stated ≠ 'no se extinguió'; sin % de extinción",
            "source_doi": yr.BASS_DOI,
        })
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- T5 verificaciones (sección 3 del pedido)
def t5_verify(exp: pd.DataFrame, f: pd.DataFrame, t1: pd.DataFrame) -> pd.DataFrame:
    rows = []

    def add(cid, desc, esperado, csv, nota="", coincide=None):
        if coincide is None:
            coincide = "si" if str(esperado) == str(csv) else "no"
        rows.append({"id": cid, "descripcion": desc, "valor_referencia": esperado, "valor_csv": csv,
                     "coincide": coincide, "nota": nota})

    # reutiliza las verificaciones de Yael (tabla 3.1, Fer, filas de control)
    known_fer = {"F-S2a-tol", "F-P-10.2-10.5 psi", "F-P-30-45 psi"}
    yv = yr.verifications(f, yr.scenarios_table(f, MAIN_TOL))
    for _, r in yv.iterrows():
        nota = r["nota"] if isinstance(r["nota"], str) else ""
        if r["id"] in known_fer:
            nota = "ERROR CONOCIDO de Fer (sección 4 del pedido); la cifra oficial es la del CSV. " + nota
        rows.append({"id": "Y:" + r["id"], "descripcion": r["descripcion"], "valor_referencia": r["valor_esperado"],
                     "valor_csv": r["valor_csv"], "coincide": r["coincide"], "nota": nota})
    add("FLEX-filas", "Filas FLEX", 274, len(f))
    add("FLEX-ids", "test_id únicos (193F001 duplicada)", 273, f["test_id"].nunique())
    add("FLEX-outcome", "extinction/disruption/completion", "186/61/27",
        "/".join(str(int((f["outcome"] == o).sum())) for o in yr.OUTCOMES))
    add("FLEX-fuel", "metanol/heptano", "157/117",
        f"{int((f['material_or_fuel'] == 'methanol').sum())}/{int((f['material_or_fuel'] == 'heptane').sum())}")
    co2, he = f["co2_fraction"] > 0, f["he_fraction"] > 0
    add("FLEX-co2", "CO2>0", 123, int(co2.sum()))
    add("FLEX-he", "He>0", 50, int(he.sum()))
    add("FLEX-co2he", "CO2 y He juntos", 0, int((co2 & he).sum()))
    add("FLEX-clean07", "Sin supresor a ~0.7 atm", 22, int((f["sin_supresor"] & (f["nivel_presion"] == "~0.7 atm")).sum()))
    band = yr.assign_band(f["o2"], SCHEME)
    add("FLEX-clean07-021", "Sin supresor en 0.21-0.24 a ~0.7 atm", 0,
        int((f["sin_supresor"] & (f["nivel_presion"] == "~0.7 atm") & (band == "0.21-0.24")).sum()))
    pmin = float(f["pressure_atm"].min())
    add("FLEX-psimin", "Presión mínima (atm / psi)", "0.692 / 10.18", f"{pmin:.4f} / {f['psi'].min():.2f}",
        "0.692 = 0.6925 truncado a 3 decimales", coincide="si" if int(pmin * 1000) == 692 and round(f["psi"].min(), 2) == 10.18 else "no")
    o30 = (f["o2"] == 0.30) & (f["nivel_presion"] == "~1.0 atm")
    add("FLEX-o30", "O2 0.30 a ~1 atm: n y extinciones", "7; 178F001,206R001",
        f"{int(o30.sum())}; {','.join(sorted(f.loc[o30 & (f['outcome'] == 'extinction'), 'test_id']))}")
    hi = f["nivel_presion"] == ">2 atm"
    add("FLEX-hi", ">2 atm: n, O2 y CO2", "9; O2 0.21; CO2 0.7",
        f"{int(hi.sum())}; O2 {','.join(f'{v:g}' for v in sorted(f.loc[hi, 'o2'].unique()))}; "
        f"CO2 {','.join(f'{v:g}' for v in sorted(f.loc[hi, 'co2_fraction'].unique()))}")
    t1s = t1[t1["tipo"] == "escenario"].set_index("escenario")
    add("ESC-E1", "Tierra n / sin supresor", "49 / 29", f"{t1s.loc['E1', 'n_total']} / {t1s.loc['E1', 'n_sin_supresor']}")
    r1 = t1s.loc["R1"]
    add("ESC-R1", "Lunar Fer: n; met+hep; disr+compl", "17; 9+8; 15+2",
        f"{r1['n_total']}; {r1['n_methanol']}+{r1['n_heptane']}; {r1['n_disruption']}+{r1['n_completion']}")
    for sid in ("E3", "E4", "E5"):
        add(f"ESC-{sid}", f"{t1s.loc[sid, 'nombre']}: n", 0, t1s.loc[sid, "n_total"])
    nb = t1[(t1["escenario"] == "E3") & (t1["tipo"] != "escenario")].iloc[0]
    add("ESC-E3-vecino", "Vecino de 34 %/8.2 psi", "O2 0.34 a ~0.7 atm; n=9", f"{nb['vecino_condicion']}; n={nb['n_total']}")
    b = exp[exp["program"] == "BASS-II"]
    add("BASS-n", "BASS-II filas", 129, len(b))
    add("BASS-res", "Con resultado / not_stated", "26 / 103",
        f"{int(b['outcome_source'].eq('ai_extracted').sum())} / {int(b['outcome_source'].eq('not_stated').sum())}")
    add("BASS-out", "extinction/blowoff/no_ignition/not_sustained", "17/7/1/1",
        "/".join(str(int((b["outcome"] == o).sum())) for o in BASS_OUTCOMES))
    add("BASS-src", "Todas las de resultado son ai_extracted", "si",
        "si" if b.loc[b["outcome"].notna(), "outcome_source"].eq("ai_extracted").all() else "no")
    add("BASS-p", "BASS-II sin presión registrada (nulas)", 129, int(b["pressure_atm"].isna().sum()))
    add("BASS-o2", "BASS-II O2 inicial máximo", 0.222, round(float(b["o2_fraction"].max()), 3))
    add("BASS-cat", "material_category nula en BASS-II (esta rama)", 129, int(b["material_category"].isna().sum()),
        "El groupby(['material_category','outcome']) del mensaje del líder devuelve vacío aquí.")
    grp = b.groupby(["material_category", "outcome"]).size()
    add("BASS-groupby", "Filas del groupby material_category × outcome", 0, len(grp))
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- texto de ancho fijo
def _block(title: str, df: pd.DataFrame, cols=None, index=False) -> str:
    d = df if cols is None else df[cols]
    return f"{title}\n{'-' * len(title)}\n{d.fillna('').to_string(index=index)}\n"


def plain_text(t1, t2, t2c, t3, t4) -> str:
    t1v = t1.copy()
    t1v["res(ext/dis/comp)"] = t1v.apply(lambda r: f"{r['n_extinction']}/{r['n_disruption']}/{r['n_completion']}", axis=1)
    t1v["met/hep"] = t1v.apply(lambda r: f"{r['n_methanol']}/{r['n_heptane']}", axis=1)
    t1v["vecino"] = t1v.get("vecino_condicion", pd.Series("", index=t1v.index)).fillna("")
    t1v.loc[t1v["tipo"] == "escenario", "vecino"] = ""
    t1v["dO2(pp)/dpsi"] = t1v.apply(
        lambda r: f"{r['delta_o2_puntos_pct']:+g}/{r['delta_psi_min']:+g}" if r["estado"] == "vecino" else "", axis=1)
    t1v["id"] = t1v.apply(lambda r: r["escenario"] + (" vecino" if r["estado"] == "vecino" else ""), axis=1)
    t3v = t3[t3["n"] > 0].copy()
    t3v["res(e/d/c)"] = t3v.apply(lambda r: f"{r['n_extinction']}/{r['n_disruption']}/{r['n_completion']}", axis=1)
    head = ("FLEX (NASA PSI-69, DOI 10.60555/mbq8-0451) y BASS-II (PSI-25, DOI 10.60555/4qc4-de67)\n"
            "Tolerancia: ±0.01 O2 y ±0.5 psi para TODOS los escenarios. n siempre visible; n<5 = gris (no interpretar).\n"
            "% de extinción = descriptivo, no probabilidad. CO2/He confundidos con O2. 'disruption' no definido por la fuente.\n"
            "'vecino' = condición probada más cercana: NO es el escenario.\n")
    return "\n".join([
        head,
        _block("T1 · Escenarios", t1v, ["id", "nombre", "n_total", "n_sin_supresor", "met/hep", "res(ext/dis/comp)",
                                        "estado", "vecino", "dO2(pp)/dpsi"]),
        _block("T2a · O2 × presión, todas las pruebas (n)", t2, index=True),
        _block("T2b · O2 × presión, sin supresor (CO2=0 y He=0)", t2c, index=True),
        _block("T3 · Combustible × O2, solo sin supresor, por presión (tasa K media mm2/s solo si n>=5; celdas n=0 omitidas)",
               t3v, ["combustible", "banda_o2", "nivel_presion", "n", "n_con_tasa", "tasa_media_mm2_s", "res(e/d/c)"]),
        _block("T4 · BASS-II por categoría de material (conteos; sin % de extinción; sin presión registrada; O2 máx 22.2 %)",
               t4, ["categoria_propuesta", "color", "n_total", "n_con_resultado_ai_extracted", "n_not_stated",
                    "n_extinction", "n_blowoff", "n_no_ignition", "n_not_sustained", "ignicion_observada_en_>=1_prueba"]),
        "T4 nota: categorías de docs/material_mapping_proposal.csv. Fer las aprobó sin cambios en el issue #3 (rama\n"
        "feat/baz-mapeo-materiales, aún no unida a main). Resultados BASS-II extraídos por IA (ai_*), pendientes de revisión.\n",
    ])


# --------------------------------------------------------------------------- main
def run(csv: str = yr.CSV, mapping_path: str = yr.MAPPING) -> Dict[str, pd.DataFrame]:
    exp = yr.load_experiments(csv)
    f = yr.load_flex(exp=exp)
    t1 = t1_scenarios(f)
    return {
        "_exp": exp, "_flex": f,
        "t1_escenarios": t1,
        "t2_o2_presion_total": yr.count_grid(f, SCHEME),
        "t2_o2_presion_sin_supresor": yr.count_grid(f, SCHEME, f["sin_supresor"]),
        "t3_combustible_estratificado": t3_fuel_stratified(f),
        "t4_bass2_por_material": t4_bass(exp, mapping_path),
        "verificaciones": t5_verify(exp, f, t1),
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--outdir", default=DEFAULT_OUT)
    args = ap.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    res = run()
    f = res.pop("_flex"); res.pop("_exp")
    os.makedirs(args.outdir, exist_ok=True)
    for name, df in res.items():
        df.to_csv(os.path.join(args.outdir, f"{name}.csv"), index=name.startswith("t2_"), encoding="utf-8")
    txt = plain_text(res["t1_escenarios"], res["t2_o2_presion_total"], res["t2_o2_presion_sin_supresor"],
                     res["t3_combustible_estratificado"], res["t4_bass2_por_material"])
    with open(os.path.join(args.outdir, "tablas.txt"), "w", encoding="utf-8") as fh:
        fh.write(txt)
    print(txt)
    v = res["verificaciones"]
    bad = v[v["coincide"] == "no"]
    print(f"Verificaciones: {len(v) - len(bad)}/{len(v)} coinciden")
    if len(bad):
        print(bad[["id", "valor_referencia", "valor_csv", "nota"]].to_string(index=False))
    tot = res["t2_o2_presion_total"]
    b = res["t4_bass2_por_material"].set_index("categoria_propuesta").loc["TOTAL"]
    cells = int(tot.drop(index="total").drop(columns="total").to_numpy().sum())
    ok = cells == len(f) == 274 and b["n_con_resultado_ai_extracted"] + b["n_not_stated"] == b["n_total"] == 129
    print(f"\n== VERIFICACIÓN == suma celdas FLEX = {cells}; BASS-II {b['n_con_resultado_ai_extracted']}+"
          f"{b['n_not_stated']} = {b['n_total']} -> {'OK' if ok else 'FALLO'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
