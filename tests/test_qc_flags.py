"""Tests de los qc_flags de BASS-II añadidos tras la verificación del 14 nov (docs/VERIFICACION.md, A6–A7).

Solo leen data/processed/ (no necesitan data/raw ni red). Requieren psi.sqlite (scripts/build_experiments.py).
Con pytest:      python -m pytest tests/
Sin pytest:      python3 tests/test_qc_flags.py
"""
import csv
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.join(ROOT, "src"))
import psi_queries as q  # noqa: E402

NEGATIVE_CO = {"B4", "B21", "B22", "M10", "O1", "O2", "O5a", "O20", "T25", "T26", "T27", "T28a", "T29"}
LOW_CONFIDENCE = {"P5", "P13a", "O6"}


def _rows(name):
    with open(os.path.join(ROOT, "data", "processed", name), newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _flags(row):
    return set(filter(None, (row["qc_flags"] or "").split(";")))


def _with(rows, flag):
    return {r["test_id"] for r in rows if flag in _flags(r)}


def test_co_final_censored_only_m5_and_value_not_imputed():
    rows = _rows("bass2_tests.csv")
    assert _with(rows, "co_final_censored") == {"M5"}
    m5 = next(r for r in rows if r["test_id"] == "M5")
    assert m5["co_final_ppm"] == "", "el valor censurado '>500' no debe imputarse"
    assert "M5" in _with(_rows("experiments.csv"), "co_final_censored")


def test_co_initial_negative_flagged_and_values_kept():
    rows = _rows("bass2_tests.csv")
    assert _with(rows, "co_initial_negative") == NEGATIVE_CO
    for r in rows:
        if r["test_id"] in NEGATIVE_CO:
            assert float(r["co_initial_ppm"]) < 0, "el valor negativo debe conservarse tal cual"
    assert NEGATIVE_CO <= _with(_rows("experiments.csv"), "co_initial_negative")


def test_low_confidence_extractions_flagged_and_outcome_kept():
    rows = _rows("bass2_tests.csv")
    assert _with(rows, "low_confidence") == LOW_CONFIDENCE
    for r in rows:
        if r["test_id"] in LOW_CONFIDENCE:
            assert r["ai_outcome"], "se marca, no se borra el resultado extraído"
    assert _with(_rows("experiments.csv"), "low_confidence") == LOW_CONFIDENCE


def test_queries_warn_when_low_confidence_rows_are_included():
    con = q.connect()
    rows = q.bass2_outcomes_by_o2_band(con)
    warned = [r for r in rows if r.get("low_confidence_warning")]
    assert warned, "ninguna fila agregada avisó de extracciones de baja confianza"
    for r in rows:
        has_flag = "low_confidence" in r["qc_flags"]
        assert bool(r.get("low_confidence_warning")) == has_flag


def test_material_mapping_applied_to_all_bass2_rows():
    """Mapeo aprobado por Fer en el issue #3: las 129 pruebas tienen categoría y se conservan sus marcas."""
    bass = _rows("bass2_tests.csv")
    exp = [r for r in _rows("experiments.csv") if r["program"] == "BASS-II"]
    assert len(bass) == len(exp) == 129
    assert all(r["material_category"] for r in bass + exp)
    assert {r["test_id"]: r["material_category"] for r in bass} == {r["test_id"]: r["material_category"] for r in exp}
    assert not _with(exp, "material_category_pending_review")
    assert _with(bass, "material_assumed_from_readme") == {"B3", "B5", "B7", "B12", "B13", "T3", "T7"}
    assert _with(bass, "material_text_typo") == {"M5", "M19"}
    by_id = {r["test_id"]: r for r in bass}
    assert by_id["T23"]["material_category"] == by_id["T24"]["material_category"] == "cotton_fiberglass_fabric"
    assert by_id["P14"]["color"] == "black"
    assert by_id["M5"]["width_cm"] == by_id["M19"]["width_cm"] == "2.0"
    assert all(r["color"] in ("clear", "black") for r in bass if r["material_category"] == "pmma_rod")


def test_fer_corrected_marks_every_corrected_value():
    """P14 ("1/4 blac rod"): Fer corrigió el color a black (#28). El texto original se conserva y la corrección
    lleva la marca fer_corrected en el mapeo, en bass2_tests.csv y en experiments.csv. Regla general: si el color
    asignado no aparece tal cual en el texto original, la fila tiene que llevar la marca."""
    with open(os.path.join(ROOT, "docs", "material_mapping.csv"), newline="", encoding="utf-8") as fh:
        mapping = {r["material_raw"]: r for r in csv.DictReader(fh)}
    assert mapping["1/4 blac rod"]["material_flag"] == "fer_corrected"
    assert mapping["1/4 blac rod"]["color"] == "black"
    bass = _rows("bass2_tests.csv")
    exp = {r["test_id"]: r for r in _rows("experiments.csv") if r["program"] == "BASS-II"}
    p14 = next(r for r in bass if r["test_id"] == "P14")
    assert p14["material_raw"] == "1/4 blac rod", "el valor original no debe cambiar"
    assert p14["color"] == "black"
    assert "fer_corrected" in _flags(p14) and "fer_corrected" in _flags(exp["P14"])
    assert exp["P14"]["material_or_fuel"] == "1/4 blac rod"
    for r in bass:
        if r["color"] and r["color"] not in r["material_raw"].lower():
            assert "fer_corrected" in _flags(r), f"{r['test_id']}: color corregido sin la marca fer_corrected"
    assert _with(bass, "fer_corrected") == {"P14"}


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
