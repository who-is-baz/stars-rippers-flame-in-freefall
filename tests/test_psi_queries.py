"""Tests of src/psi_queries.py. They need data/processed/psi.sqlite (scripts/build_experiments.py).

Con pytest:      python -m pytest tests/
Without pytest:  python3 tests/test_psi_queries.py
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
    assert rows, "the query returned no rows"
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
    # the n values add up to the methanol total without suppressant and with known pressure
    expected = _total(CON, "program='FLEX' AND material_or_fuel='methanol' AND co2_fraction=0 AND he_fraction=0")
    assert sum(r["n"] for r in rows) == expected
    # the range filter works
    sub = q.extinction_rate_by_o2_pressure(CON, fuel="methanol", o2_range=(0.2, 0.22), pressure_range=(0.9, 1.1))
    assert sub and all(0.2 <= r["o2_fraction"] <= 0.22 and r["pressure_atm"] == 1.0 for r in sub)


def test_q2_co2_effect():
    rows = _common(q.co2_effect(CON), FLEX_DOI)
    assert any(r["co2_fraction"] == 0 for r in rows), "the reference level (CO2=0) is missing"
    assert any(r["co2_fraction"] > 0 for r in rows)
    assert all("avg_o2_fraction" in r for r in rows), "it must expose O2 to show the confounding"
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
            assert 0 < r["avg_burning_rate_mm2_s"] < 2, "K outside the physical range (mm²/s)"


def test_q5_extinction_diameter_only_extinction():
    rows = _common(q.extinction_diameter_by_pressure(CON), FLEX_DOI)
    assert sum(r["n"] for r in rows) == _total(CON, "program='FLEX' AND outcome='extinction'")
    # the database must have no extinction diameter in rows whose outcome is not extinction
    assert _total(CON, "extinction_diameter_mm IS NOT NULL AND outcome <> 'extinction'") == 0


def test_q6_bass2_outcomes_by_o2_band():
    rows = _common(q.bass2_outcomes_by_o2_band(CON), BASS_DOI)
    assert sum(r["n"] for r in rows) == _total(CON, "program='BASS-II'")
    for r in rows:
        parts = r["n_low_flow_extinction"] + r["n_blowoff"] + r["n_no_ignition_or_not_sustained"] + r["n_not_stated"]
        assert parts == r["n"]
        assert "pct_extinction" not in r, "BASS-II must not report an extinction % (incomplete outcome)"


def test_small_n_percentages_always_warned():
    """No cell with n<5 may return a percentage without a warning, in any query."""
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
                assert r.get("warning"), f"{name}: cell n={r['n']} with {pct_keys} and no warning: {r}"
            else:
                assert r.get("warning") is None
    assert small_seen > 0, "the test exercised no small cell"


def test_rejects_invalid_parameters():
    for bad in (lambda: q.extinction_rate_by_o2_pressure(CON, program="DROP TABLE"),
                lambda: q.extinction_rate_by_o2_pressure(CON, suppressant="sf6"),
                lambda: q.suppressant_effect(CON, "n2")):
        try:
            bad()
        except ValueError:
            continue
        raise AssertionError("an invalid parameter was accepted")


def test_connection_is_read_only():
    try:
        CON.execute("DELETE FROM experiments")
    except sqlite3.OperationalError:
        return
    raise AssertionError("the connection allowed a write")


def test_messages_in_english_and_o2_band_labels():
    """Contract (docs/API.md): texts that reach the UI are in English; the first band is "<0.15" and comes first."""
    assert q.PCT_NOTE == "descriptive, not a probability"
    assert q.SMALL_N_WARNING.format(min_n=5).startswith("n<5")
    assert "low-confidence" in q.LOW_CONFIDENCE_WARNING
    assert [b[2] for b in q.O2_BANDS] == ["<0.15", "0.15-0.18", "0.18-0.21", "0.21-0.24", ">=0.24"]
    q6 = [r["o2_band"] for r in q.bass2_outcomes_by_o2_band(CON)]
    assert q6 == sorted(q6, key=[b[2] for b in q.O2_BANDS].index), f"bands out of order: {q6}"


def test_list_experiments_filters_and_pagination():
    allr = q.list_experiments(CON, limit=q.MAX_LIMIT)
    assert allr["total"] == _total(CON, "1=1") and len(allr["items"]) == min(allr["total"], q.MAX_LIMIT)
    ext = q.list_experiments(CON, program="FLEX", outcome="extinction", limit=500)
    assert ext["total"] == _total(CON, "program='FLEX' AND outcome='extinction'")
    assert all(r["outcome"] == "extinction" and isinstance(r["qc_flags"], list) for r in ext["items"])
    ns = q.list_experiments(CON, outcome="not_stated", limit=500)
    assert ns["total"] == _total(CON, "outcome_source='not_stated'") and all(r["outcome"] is None for r in ns["items"])
    p1 = q.list_experiments(CON, limit=10, offset=0)["items"]
    p2 = q.list_experiments(CON, limit=10, offset=10)["items"]
    assert len(p1) == len(p2) == 10 and not {(r["program"], r["test_id"]) for r in p1} & {(r["program"], r["test_id"]) for r in p2}
    low = q.list_experiments(CON, program="BASS-II", limit=500)["items"]
    assert all(("low_confidence_warning" in r) == ("low_confidence" in r["qc_flags"]) for r in low)
    for bad in (dict(outcome="exploded"), dict(limit=0), dict(limit=q.MAX_LIMIT + 1), dict(offset=-1)):
        try:
            q.list_experiments(CON, **bad)
        except ValueError:
            continue
        raise AssertionError(f"an invalid parameter was accepted: {bad}")


def test_meta_matches_data():
    m = q.meta(CON)
    assert {p["program"] for p in m["programs"]} == set(q.PROGRAMS)
    assert sum(p["n"] for p in m["programs"]) == _total(CON, "1=1")
    flex = next(p for p in m["programs"] if p["program"] == "FLEX")
    assert flex["materials"] == ["heptane", "methanol"] and flex["source_doi"] == FLEX_DOI
    assert m["source_doi"] == sorted([FLEX_DOI, BASS_DOI])
    assert m["queries"] == sorted(q.ALL_QUERIES) and len(m["queries"]) == 6


if __name__ == "__main__":  # minimal runner if pytest is not installed
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn(); print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001
                failed += 1; print(f"FAIL {name}: {e!r}")
    print(f"\n{'OK' if not failed else f'{failed} FALLAS'}")
    sys.exit(1 if failed else 0)
