"""Tests de frontend/public/data/*.json (scripts/build_frontend_data.py). Requieren psi.sqlite.

Con pytest:      python -m pytest tests/
Sin pytest:      python3 tests/test_frontend_data.py
"""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.join(ROOT, "src"))
import psi_queries as q  # noqa: E402
import scenarios as sc  # noqa: E402

DATA = os.path.join(ROOT, "frontend", "public", "data")
FILES = ("meta.json", "scenarios.json", "coverage.json", "experiments.json", "gaps.json", "materials.json",
         "answers.json", "airflow.json")
CON = q.connect()


def _load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        text = f.read()
    assert "NaN" not in text and "Infinity" not in text, f"{name}: valores no JSON"
    return json.loads(text)


def test_all_files_present_and_valid_json():
    for name in FILES:
        _load(name)


def test_experiments_match_database_and_contract_columns():
    e = _load("experiments.json")
    db = q.list_experiments(CON, limit=q.MAX_LIMIT)
    assert e["total"] == len(e["items"]) == db["total"] == 403
    contract = ["program", "test_id", "date", "material_or_fuel", "material_category", "o2_fraction",
                "pressure_atm", "co2_fraction", "he_fraction", "outcome", "outcome_source",
                "extinction_diameter_mm", "burning_rate_mm2_s", "qc_flags", "source_doi"]
    assert e["columns"][:len(contract)] == contract
    assert all(isinstance(r["qc_flags"], list) for r in e["items"])


def test_scenarios_equal_scenarios_module():
    s = {x["id"]: x for x in _load("scenarios.json")["scenarios"]}
    for r in sc.evaluate_all(CON):
        assert (s[r["id"]]["n_exact"], s[r["id"]]["n_near"], s[r["id"]]["verified"]) == \
               (r["n_exact"], r["n_near"], r["verified"])
    assert (s["lunar_challenge"]["n_exact"], s["lunar_challenge"]["n_near"]) == (0, 17)


def test_coverage_counts_and_warnings():
    c = _load("coverage.json")
    meta = _load("meta.json")
    flex_n = next(p["n"] for p in meta["programs"] if p["program"] == "FLEX")
    assert c["n_tests"] + len(meta["excluded_from_pressure_views"]) == flex_n
    assert c["n_cells"] == 2 * len(sc.O2_BANDS) * len(sc.PRESSURE_LEVELS)
    for cell in c["cells"]:
        if cell["n"] == 0:
            assert cell["status"] == "no data" and cell["pct_extinction"] is None and cell["source_doi"] == []
        else:
            assert cell["pct_note"] == q.PCT_NOTE and cell["source_doi"]
            assert (cell["warning"] is not None) == (cell["n"] < q.MIN_N)
            assert sum(cell["n_by_suppressant"].values()) == cell["n"]


def test_materials_cover_all_bass2_and_none_non_flammable():
    m = _load("materials.json")
    assert sum(x["n"] for x in m["materials"]) == m["n_tests"] == 129
    assert m["non_flammable"] == []
    for x in m["materials"]:
        assert x["n_with_outcome"] + x["n_not_stated"] == x["n"]
        assert x["classification"] in ("flammable_demonstrated", "undetermined")
        assert (x["classification"] == "undetermined") == (x["n_with_outcome"] == 0 or not any(
            k in x["n_by_outcome"] for k in ("extinction", "blowoff", "not_sustained")))
        assert "pct_extinction" not in x


def test_answers_have_citations_or_no_data():
    a = _load("answers.json")["answers"]
    assert len(a) == 12  # 10 originales + q11 y q12 (relevancia y lo que queda sin resolver)
    for x in a:
        assert x["answer"] and (x["citations"] or x["no_data"])
    gravity = next(x for x in a if "lunar gravity" in x["question"])
    assert gravity["no_data"] and gravity["answer"].startswith("No data available")


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


def test_airflow_is_ai_extracted_bass2_only_and_matches_the_table():
    import csv
    a = _load("airflow.json")
    assert a["extracted_by"] == "AI" and a["program"] == "BASS-II" and a["unit"] == "cm/s"
    with open(os.path.join(ROOT, "data", "processed", "bass2_tests.csv"), newline="", encoding="utf-8") as f:
        want = {r["test_id"]: float(r["ai_initial_air_speed_cm_s"]) for r in csv.DictReader(f) if r["ai_initial_air_speed_cm_s"]}
    assert {i["test_id"]: i["air_speed_cm_s"] for i in a["items"]} == want
    assert a["n_tests"] == len(want) == 121
