"""Tests de src/scenarios.py. Requieren data/processed/psi.sqlite (scripts/build_experiments.py).

Con pytest:      python -m pytest tests/
Sin pytest:      python3 tests/test_scenarios.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import psi_queries as q  # noqa: E402
import scenarios as s  # noqa: E402

CON = q.connect()
RES = {r["id"]: r for r in s.evaluate_all(CON)}


def test_definitions_as_data():
    assert s.TOLERANCE == {"o2_fraction": 0.01, "pressure_psi": 0.5}
    assert [b[2] for b in s.O2_BANDS] == ["<0.15", "0.15-0.18", "0.18-0.21", "0.21-0.24", ">=0.24"]
    assert [lv["label"] for lv in s.PRESSURE_LEVELS] == ["~0.7 atm", "~1.0 atm", ">2 atm"]
    assert [x["id"] for x in s.SCENARIOS] == ["earth_iss", "lunar_challenge", "lunar_nasa", "exploration", "suit"]
    for x in s.SCENARIOS:
        assert x["source"] and isinstance(x["verified"], bool)
    verified = {x["id"]: x["verified"] for x in s.SCENARIOS}
    assert verified == {"earth_iss": True, "lunar_challenge": True, "lunar_nasa": False,
                        "exploration": False, "suit": False}


def test_lunar_challenge_zero_exact_seventeen_near():
    r = RES["lunar_challenge"]
    assert r["n_exact"] == 0
    assert r["n_near"] == 17
    near = r["near"]
    assert 0.703 <= near["atm_min"] and near["atm_max"] <= 0.7143, near
    assert near["o2_min"] == 0.30 and near["o2_max"] == 0.34


def test_earth_iss_49_in_flex():
    r = RES["earth_iss"]
    assert r["program"] == "FLEX"
    assert r["n_exact"] == 49 == r["n_near"]  # criterios puntuales: exacto = dentro de la tolerancia


def test_scenarios_without_data_report_nearest_not_as_match():
    for sid in ("lunar_nasa", "exploration", "suit"):
        r = RES[sid]
        assert r["n_exact"] == r["n_near"] == 0
        assert r["nearest"]["n"] > 0 and "NOT" in r["nearest"]["note"]


def test_near_never_smaller_than_exact():
    for r in RES.values():
        assert r["n_near"] >= r["n_exact"]


def test_missing_pressure_excluded_and_reported():
    for r in RES.values():
        assert r["excluded"] == [{"test_id": "C11M201", "reason": "no pressure recorded"}]


def test_every_flex_pressure_falls_in_one_level():
    rows = q.list_experiments(CON, program="FLEX", limit=q.MAX_LIMIT)["items"]
    levels = [s.pressure_level(r["pressure_atm"]) for r in rows if r["pressure_atm"] is not None]
    assert None not in levels
    assert {lv: levels.count(lv) for lv in set(levels)} == {"~0.7 atm": 103, "~1.0 atm": 161, ">2 atm": 9}


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
