"""Tests de scripts/analysis_rangos_o2_presion.py. Solo leen data/processed/experiments.csv (no necesitan psi.sqlite).

Con pytest:      python -m pytest tests/
Sin pytest:      python tests/test_analysis_rangos.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import analysis_rangos_o2_presion as a  # noqa: E402

F = a.load_flex()


def test_cells_sum_to_274_in_every_scheme():
    for sch in a.BAND_SCHEMES:
        g = a.count_grid(F, sch)
        cells = g.drop(index="total").drop(columns="total").to_numpy().sum()
        assert cells == 274 == g.loc["total", "total"], (sch, cells)


def test_three_pressure_levels_and_cuts_fall_in_gaps():
    lv = a.pressure_levels_table(F).set_index("nivel")
    assert lv.loc[list(a.LEVELS), "n"].tolist() == [103, 161, 9]
    cl = a.detect_pressure_clusters(F["pressure_atm"])
    assert (cl["nivel"] == cl["nivel_max"]).all(), "un grupo de presión cruza un corte de etiqueta"
    assert set(cl["nivel"]) == set(a.LEVELS)


def test_clean_never_exceeds_total():
    for sch in a.BAND_SCHEMES:
        tot = a.count_grid(F, sch)
        clean = a.count_grid(F, sch, F["sin_supresor"])
        assert (clean.to_numpy() <= tot.to_numpy()).all()
    assert int(F["sin_supresor"].sum()) == 101


def test_duplicate_193F001_counted_twice_and_dedup_reported():
    assert (F["test_id"] == "193F001").sum() == 2
    tot = a.count_grid(F, "B")
    dd = a.count_grid(F, "B", dedup=True)
    assert tot.loc["total", "total"] - dd.loc["total", "total"] == 1


def test_C11M201_is_sin_dato_not_imputed():
    r = F[F["test_id"] == "C11M201"].iloc[0]
    assert str(r["nivel_presion"]) == a.NO_DATA
    assert r["pressure_atm"] != r["pressure_atm"]  # NaN: no se imputó
    g = a.count_grid(F, "B")
    assert g.loc["total", a.NO_DATA] == 1
    # una presión nula nunca entra en un escenario
    for sc in a.SCENARIOS:
        assert "C11M201" not in set(F[a.scenario_mask(F, sc, 0.02, 0.5, "sym")]["test_id"])


def test_reproduces_yael_table_31_with_scheme_B():
    g = a.count_grid(F, "B")
    for band, exp in a.YAEL_31.items():
        assert tuple(int(g.loc[band, c]) for c in list(a.LEVELS) + [a.NO_DATA, "total"]) == exp, band


def test_same_tolerance_for_all_scenarios_fer_numbers():
    s = a.scenarios_table(F, (0.01, 0.5, "sym"))
    s = s[s["tipo"] == "escenario"].set_index(["escenario", "tolerancia"])
    assert s.loc[("S1", "O2±0.01 psi±0.5"), "n_total"] == 49
    assert s.loc[("S1", "O2±0.01 psi±0.5"), "n_sin_supresor"] == 29
    assert s.loc[("S1", "O2±0.02 psi±0.5"), "n_total"] == 56
    assert s.loc[("S2a", "estricto"), "n_total"] == 0
    assert s.loc[("S2a", "O2±0.01 psi±0.5"), "n_total"] == 17  # la inconsistencia de Fer
    for sid in ("S2c", "S3a", "S3b"):  # 8.2 psi y 4.3 psi: ninguna prueba con ninguna tolerancia
        assert (s.loc[sid, "n_total"] == 0).all(), sid


def test_reproduces_charly_rows():
    c = a.charly_reconciliation(F, "B")
    rep = c[c["version"].str.startswith("a_")]
    assert len(rep) == 8 and rep["coincide_con_charly"].all()


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
