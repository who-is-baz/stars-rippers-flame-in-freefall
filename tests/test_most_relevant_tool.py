"""Catalogue tool `most_relevant_tests`: uses the SAME relevance as the Experiments view (parity with the independent reference)."""
import json
import os

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend import low, pipeline, tools as T, verify
from backend.app import create_app
from backend.config import Settings
from fake_llm import FakeLLM, route, text

ROOT = os.path.join(os.path.dirname(__file__), "..")
GOLDEN = json.load(open(os.path.join(ROOT, "frontend", "src", "lib", "mentor_golden.json"), encoding="utf-8"))
FORBIDDEN = verify.BANNED


@pytest.fixture(scope="module")
def con():
    from backend import data
    c = data.connect()
    yield c
    c.close()


def test_tool_is_in_the_closed_catalog_and_the_router_prompt_mentions_it():
    assert "most_relevant_tests" in T.TOOLS
    assert "most_relevant_tests" in pipeline._catalog() and "lunar_nasa" in pipeline.ROUTER_SYSTEM


@pytest.mark.parametrize("args", [{}, {"scenario_id": "suit", "o2": 0.2, "pressure_psi": 10}, {"o2": 0.2}, {"scenario_id": "mars"}, {"scenario_id": "suit", "limit": 99}, {"scenario_id": "suit", "sql": "x"}])
def test_args_are_validated(con, args):
    with pytest.raises((ValidationError, ValueError)):
        T.execute(con, "most_relevant_tests", args)


@pytest.mark.parametrize("sid", list(GOLDEN["scenarios"]))
def test_tool_order_equals_the_independent_reference(con, sid):
    tr = T.execute(con, "most_relevant_tests", {"scenario_id": sid, "limit": 10})
    got = [{"program": i["program"], "test_id": i["test_id"], "relevance": i["relevance"]} for i in tr.result["items"]]
    assert got == GOLDEN["scenarios"][sid]["top10"]
    c = GOLDEN["scenarios"][sid]["relevance_counts"]
    assert (tr.result["n_exact"], tr.result["n_near"]) == (c["exact"], c["near"])
    assert tr.no_data is False and sum(x["test_ids_total"] for x in tr.citations()) == 10


def test_template_has_no_forbidden_words_and_says_it_is_not_a_safety_ranking(con):
    for sid in GOLDEN["scenarios"]:
        t = T.template(T.execute(con, "most_relevant_tests", {"scenario_id": sid}))
        assert "not a safety ranking" in t
        assert not any(rx.search(t.replace("not a safety ranking", "")) for rx, _ in FORBIDDEN), t
    suit = T.template(T.execute(con, "most_relevant_tests", {"scenario_id": "suit"}))
    assert suit.startswith("No test is exact or near") and "not this atmosphere" in suit


def test_custom_atmosphere(con):
    tr = T.execute(con, "most_relevant_tests", {"o2": 0.21, "pressure_psi": 14.7, "limit": 3})
    assert tr.result["n_exact"] == 49 and len(tr.result["items"]) == 3


def test_low_routing_named_scenario_unnamed_and_suggested():
    r = low.route("which tests are most relevant to the moon base")
    assert (r.kind, r.tool, r.args) == ("tool", "most_relevant_tests", {"scenario_id": "lunar_challenge"})
    assert low.route("which tests are most relevant to the spacesuit").args == {"scenario_id": "suit"}
    assert low.route("which tests are most relevant").about_id == "relevance_order"
    s = low.route("Which tests are most relevant to the lunar habitat scenario?")
    assert (s.kind, s.answer_id) == ("precomputed", "q11")          # the suggested question keeps its precomputed answer


def test_ask_low_and_medium_with_a_model_double():
    llm = FakeLLM([route("most_relevant_tests", scenario_id="lunar_challenge", limit=3),
                   text("For the Moon base air there are 0 exact and 17 near tests among 403; the closest three are 219F001, 220R001 and 220R002.")])
    c = TestClient(create_app(settings=Settings(ask_rate_per_min=0), llm=llm))
    low_r = c.post("/api/ask", json={"question": "which tests are most relevant to the moon base", "level": "low"}).json()
    assert low_r["tool_calls"][0]["tool"] == "most_relevant_tests" and low_r["citations"][0]["test_ids_total"] == 5
    med = c.post("/api/ask", json={"question": "list the tests closest to the Moon base air", "level": "medium", "model": "qwen3:8b"}).json()
    assert med["meta"]["mode"] == "ollama", med["meta"]["warnings"]
    assert med["tool_calls"][0]["args"]["scenario_id"] == "lunar_challenge"
