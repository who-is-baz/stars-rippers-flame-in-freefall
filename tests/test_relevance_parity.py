"""El orden de relevancia, completo/parcial y las clases del backend (src/backend/relevance.py) deben coincidir con la recomputación
independiente (scripts/gen_mentor_golden.py) y, por tanto, con el front. Y el archivo de referencia debe estar al día."""
import importlib.util
import json
import os
import subprocess
import sys

import pytest

from backend import data, relevance as R

ROOT = os.path.join(os.path.dirname(__file__), "..")
GOLDEN = json.load(open(os.path.join(ROOT, "frontend", "src", "lib", "mentor_golden.json"), encoding="utf-8"))


@pytest.fixture(scope="module")
def rows():
    con = data.connect()
    try:
        return data.q.list_experiments(con, limit=data.q.MAX_LIMIT)["items"]
    finally:
        con.close()


def test_golden_is_up_to_date():
    r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "gen_mentor_golden.py"), "--check"], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr


def test_completeness_matches(rows):
    c = GOLDEN["completeness"]
    assert len(rows) == c["tests"]
    assert sum(R.is_complete(r) for r in rows) == c["complete"]
    assert sum(not R.is_complete(r) for r in rows) == c["partial"]
    assert sum(R.is_complete(r) and r["outcome_source"] == "ai_extracted" for r in rows) == c["complete_ai_extracted"]


@pytest.mark.parametrize("sid", list(GOLDEN["scenarios"]))
def test_relevance_order_and_counts_match(rows, sid):
    o2, p = R.scenario_criteria(sid)
    ranked = R.rank(rows, o2, p)
    g = GOLDEN["scenarios"][sid]
    assert R.counts(ranked) == g["relevance_counts"]
    assert [{"program": x["row"]["program"], "test_id": x["row"]["test_id"], "relevance": x["relevance"]} for x in ranked[:10]] == g["top10"]


def test_scenario_counts_agree_with_scenarios_json(rows):
    pre = data.precomputed()["scenarios"]["scenarios"]
    for s in pre:
        o2, p = R.scenario_criteria(s["id"])
        c = R.counts(R.rank(rows, o2, p))
        assert (c["exact"], c["exact"] + c["near"]) == (s["n_exact"], s["n_near"])
