"""Tests de scripts/analysis_resumen_equipo.py. Solo leen data/processed/experiments.csv y el mapeo de materiales.

Con pytest:      python -m pytest tests/
Sin pytest:      python tests/test_resumen_equipo.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import analysis_resumen_equipo as r  # noqa: E402

RES = r.run()
F = RES["_flex"]


def test_flex_cells_sum_274():
    t = RES["t2_o2_presion_total"]
    assert t.drop(index="total").drop(columns="total").to_numpy().sum() == 274 == len(F)


def test_clean_le_total():
    assert (RES["t2_o2_presion_sin_supresor"].to_numpy() <= RES["t2_o2_presion_total"].to_numpy()).all()


def test_bass2_26_plus_103_is_129_and_no_percentages():
    t4 = RES["t4_bass2_por_material"].set_index("categoria_propuesta")
    tot = t4.loc["TOTAL"]
    assert (tot["n_con_resultado_ai_extracted"], tot["n_not_stated"], tot["n_total"]) == (26, 103, 129)
    # sin % de extinción en BASS-II (las únicas columnas en % son de O2 medido)
    assert not any(("pct" in c or "%" in c) and "o2" not in c for c in RES["t4_bass2_por_material"].columns)
    # las categorías (sin contar los desgloses por color ni TOTAL) suman 129
    cats = RES["t4_bass2_por_material"]
    assert cats[(cats["color"] == "") & (cats["categoria_propuesta"] != "TOTAL")]["n_total"].sum() == 129


def test_C11M201_sin_dato_and_193F001_counted():
    t = RES["t2_o2_presion_total"]
    assert t.loc["total", "sin_dato"] == 1
    assert str(F.loc[F["test_id"] == "C11M201", "nivel_presion"].iloc[0]) == "sin_dato"
    assert (F["test_id"] == "193F001").sum() == 2 and F["test_id"].nunique() == 273


def test_rate_hidden_when_n_lt_5():
    t3 = RES["t3_combustible_estratificado"]
    small = t3[(t3["n"] > 0) & (t3["n"] < 5)]
    assert len(small) and (small["tasa_media_mm2_s"] == r.GRIS).all()


def test_zero_scenarios_have_neighbor_row():
    t1 = RES["t1_escenarios"]
    for sid in t1.loc[(t1["tipo"] == "escenario") & (t1["n_total"] == 0), "escenario"]:
        assert ((t1["escenario"] == sid) & t1["tipo"].str.startswith("vecino")).sum() == 1, sid


def test_only_known_mismatches():
    v = RES["verificaciones"]
    bad = set(v.loc[v["coincide"] == "no", "id"])
    assert bad == {"Y:F-S2a-tol", "Y:F-P-10.2-10.5 psi", "Y:F-P-30-45 psi"}, bad


if __name__ == "__main__":  # runner mínimo si pytest no está instalado
    fails = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn(); print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001
                fails += 1; print(f"FAIL {name}: {e!r}")
    print("\nOK" if not fails else f"\n{fails} FALLO(S)")
    sys.exit(1 if fails else 0)
