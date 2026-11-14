"""Tests de src/psi_queries.py. Requieren data/processed/psi.sqlite (scripts/build_experiments.py).

Con pytest:      python -m pytest tests/
Sin pytest:      python3 tests/test_psi_queries.py
"""
import os
import sqlite3
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import psi_queries as q  # noqa: E402

CON = q.connect()
REQUIRED = {"n", "qc_flags", "source_doi"}
FLEX_DOI, BASS_DOI = "10.60555/mbq8-0451", "10.60555/4qc4-de67"


def _common(rows, doi):
    assert rows, "la consulta no devolvió filas"
    for r in rows:
        assert REQUIRED <= r.keys()
        assert r["n"] >= 1
        assert isinstance(r["qc_flags"], list)
        assert r["source_doi"] == [doi]
    return rows


def _total(con, where):
    return con.execute(f"SELECT COUNT(*) FROM experiments WHERE {where}").fetchone()[0]


def test_q1_extinction_rate_by_o2_pressure():
    rows = _common(q.extinction_rate_by_o2_pressure(CON, fuel="methanol"), FLEX_DOI)
    for r in rows:
        assert 0 <= r["pct_extinction"] <= 100
        assert r["n_extinction"] <= r["n"]
    # los n suman el total de metanol sin supresor con presión conocida
    expected = _total(CON, "program='FLEX' AND material_or_fuel='methanol' AND co2_fraction=0 AND he_fraction=0")
    assert sum(r["n"] for r in rows) == expected
    # el filtro de rango funciona
    sub = q.extinction_rate_by_o2_pressure(CON, fuel="methanol", o2_range=(0.2, 0.22), pressure_range=(0.9, 1.1))
    assert sub and all(0.2 <= r["o2_fraction"] <= 0.22 and r["pressure_atm"] == 1.0 for r in sub)


def test_q2_co2_effect():
    rows = _common(q.co2_effect(CON), FLEX_DOI)
    assert any(r["co2_fraction"] == 0 for r in rows), "falta el nivel de referencia (CO2=0)"
    assert any(r["co2_fraction"] > 0 for r in rows)
    assert all("avg_o2_fraction" in r for r in rows), "debe exponer O2 para mostrar el confundido"
    assert all(0.9 <= r["pressure_atm"] <= 1.1 for r in rows)


def test_q3_he_effect():
    rows = _common(q.he_effect(CON, fuel="heptane"), FLEX_DOI)
    assert {r["fuel"] for r in rows} == {"heptane"}
    assert any(r["he_fraction"] > 0 for r in rows)
    total_he = _total(CON, "program='FLEX' AND material_or_fuel='heptane' AND he_fraction>0")
    assert sum(r["n"] for r in rows if r["he_fraction"] > 0) == total_he


def test_q4_burning_rate_by_o2():
    rows = _common(q.burning_rate_by_o2(CON), FLEX_DOI)
    for r in rows:
        assert r["n_k"] <= r["n"]
        if r["n_k"]:
            assert r["min_burning_rate_mm2_s"] <= r["avg_burning_rate_mm2_s"] <= r["max_burning_rate_mm2_s"]
            assert 0 < r["avg_burning_rate_mm2_s"] < 2, "K fuera de rango físico (mm²/s)"


def test_q5_extinction_diameter_only_extinction():
    rows = _common(q.extinction_diameter_by_pressure(CON), FLEX_DOI)
    assert sum(r["n"] for r in rows) == _total(CON, "program='FLEX' AND outcome='extinction'")
    # en la base no debe haber diámetro de extinción en filas cuyo outcome no sea extinction
    assert _total(CON, "extinction_diameter_mm IS NOT NULL AND outcome <> 'extinction'") == 0


def test_q6_bass2_outcomes_by_o2_band():
    rows = _common(q.bass2_outcomes_by_o2_band(CON), BASS_DOI)
    assert sum(r["n"] for r in rows) == _total(CON, "program='BASS-II'")
    for r in rows:
        parts = r["n_low_flow_extinction"] + r["n_blowoff"] + r["n_no_ignition_or_not_sustained"] + r["n_not_stated"]
        assert parts == r["n"]
        assert "pct_extinction" not in r, "BASS-II no debe reportar % de extinción (outcome incompleto)"


def test_small_n_percentages_always_warned():
    """Ninguna celda con n<5 puede devolver un porcentaje sin advertencia, en ninguna consulta."""
    outputs = {name: fn(CON) for name, fn in q.ALL_QUERIES.items()}
    outputs["coverage_grid"] = q.flex_coverage_grid(CON)
    small_seen = 0
    for name, rows in outputs.items():
        for r in rows:
            pct_keys = [k for k in r if k.startswith("pct_") and k != "pct_note"]
            if not pct_keys:
                continue
            assert r.get("pct_note") == q.PCT_NOTE, f"{name}: falta pct_note"
            if r["n"] < q.MIN_N:
                small_seen += 1
                assert r.get("warning"), f"{name}: celda n={r['n']} con {pct_keys} sin advertencia: {r}"
            else:
                assert r.get("warning") is None
    assert small_seen > 0, "el test no ejercitó ninguna celda pequeña"


def test_rejects_invalid_parameters():
    for bad in (lambda: q.extinction_rate_by_o2_pressure(CON, program="DROP TABLE"),
                lambda: q.extinction_rate_by_o2_pressure(CON, suppressant="sf6"),
                lambda: q.suppressant_effect(CON, "n2")):
        try:
            bad()
        except ValueError:
            continue
        raise AssertionError("se aceptó un parámetro inválido")


def test_connection_is_read_only():
    try:
        CON.execute("DELETE FROM experiments")
    except sqlite3.OperationalError:
        return
    raise AssertionError("la conexión permitió escribir")


if __name__ == "__main__":  # runner mínimo si pytest no está instalado
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn(); print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001
                failed += 1; print(f"FAIL {name}: {e!r}")
    print(f"\n{'OK' if not failed else f'{failed} FALLAS'}")
    sys.exit(1 if failed else 0)
