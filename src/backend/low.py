"""`low` level: no model. Keyword rules → a tool or a precomputed answer.

The 10 suggested questions answer exactly what frontend/public/data/answers.json says (same code:
scripts/build_frontend_data.build_answers). The rule order follows frontend/src/assistant/engine.ts and adds:
safety/prediction traps, Spanish keywords and Q1/Q5/Q6 queries by keyword.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

from . import about, data, scope
from .scope import LIVE_RE, SAFETY_RE  # noqa: F401
from . import tools as T

LIVE_TEXT = "No data: these are archived ISS experiments; there is no live data on this page."
SAFETY_TEXT = (f"{T.NO_DATA_TEXT} These data describe what happened in specific microgravity tests on the ISS; "
               "they do not rate how safe a material, fuel or atmosphere is, and they do not predict fires elsewhere.")

FUEL_RE = re.compile(r"\b(heptane|methanol|heptano|metanol)\b", re.I)
PCT_RE = re.compile(r"(\d{1,3}(?:\.\d+)?)\s*%\s*(?:o2|o₂|oxygen|ox[ií]geno)?", re.I)
ATM_RE = re.compile(r"(\d+(?:\.\d+)?)\s*atm\b", re.I)
PSI_RE = re.compile(r"(\d+(?:\.\d+)?)\s*psi", re.I)


@dataclass
class Route:
    kind: str                       # "precomputed" | "tool" | "fixed"
    answer_id: Optional[str] = None
    tool: Optional[str] = None
    args: dict = field(default_factory=dict)
    text: Optional[str] = None
    no_data: bool = False
    warnings: List[str] = field(default_factory=list)
    about_id: Optional[str] = None
    guard: bool = False             # safety rule: medium/high do not call the model either


# (regex, answer_id) — same order and expressions as engine.ts, with Spanish equivalents.
PRECOMPUTED_RULES = [
    (re.compile(r"(most relevant|relevan)", re.I), "q11"),
    (re.compile(r"(can'?t|cannot|can not)\b.{0,20}\btell", re.I), "q12"),
    (re.compile(r"(gravity|gravedad|partial|parcial|mars|martian|marte)", re.I), "q10"),
    (re.compile(r"(exploration|exploraci[oó]n|8\.2)", re.I), "q04"),
    (re.compile(r"(suit|traje|\beva\b|4\.3)", re.I), "q05"),
    (re.compile(r"(moon|lunar|luna|habitat|h[aá]bitat)", re.I), "q03"),
    (re.compile(r"disrupt", re.I), "q07"),
    (re.compile(r"(co2|co₂|helium|helio|\bhe\b|suppress|supres|put out|extinguish|apaga|extingu)", re.I), "q08"),
    (re.compile(r"(heptane|methanol|heptano|metanol|faster|r[aá]pido|burn(ing)? rate|velocidad de quemado|\bfuels?\b|combustibles?)", re.I), "q06"),
    (re.compile(r"(material|pmma|fabric|tela|bass|solid|s[oó]lido|aramid|cotton|algod[oó]n|candle|vela)", re.I), "q09"),
    (re.compile(r"(earth|tierra|\biss\b|cabin|cabina|sea level|nivel del mar|14\.7)", re.I), "q02"),
    (re.compile(r"(how many|cu[aá]nt[oa]s|cover|experiments|experimentos|dataset|tests|pruebas)", re.I), "q01"),
]
TEST_ID_RE = re.compile(r"\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{6,}\b")
TEST_WORD_RE = re.compile(r"\b(?:test|prueba)\s+#?([A-Za-z0-9]{2,})\b", re.I)


def _fuel(text: str) -> Optional[str]:
    m = FUEL_RE.search(text)
    if not m:
        return None
    return "heptane" if m.group(1).lower().startswith("hept") else "methanol"


def _pressure(text: str) -> dict:
    m = ATM_RE.search(text)
    if m:
        v = float(m.group(1))
        return {"pressure_min": round(max(v - 0.1, 0), 3), "pressure_max": round(v + 0.1, 3)}
    m = PSI_RE.search(text)
    if m:
        atm = float(m.group(1)) / T.PSI_PER_ATM
        tol = 0.5 / T.PSI_PER_ATM
        return {"pressure_min": round(max(atm - tol, 0), 4), "pressure_max": round(atm + tol, 4)}
    return {}


def _o2(text: str) -> dict:
    m = PCT_RE.search(text)
    if m and float(m.group(1)) <= 100:
        f = float(m.group(1)) / 100
        return {"o2_min": round(max(f - 0.01, 0), 3), "o2_max": round(min(f + 0.01, 1), 3)}
    return {}


_SUG: dict = {}


def _suggested(db_path=None) -> set:
    """Keys of the suggested questions (answers.json): they ALWAYS answer with their data, never with 'about'."""
    if db_path not in _SUG:
        _SUG[db_path] = {about.key(a["question"]) for a in data.precomputed(db_path)["answers"]["answers"]}
    return _SUG[db_path]


SCENARIO_WORDS = [  # (pattern, scenario id): the first match wins
    (re.compile(r"moon.?base|challenge|expected moon", re.I), "lunar_challenge"),
    (re.compile(r"lunar habitat|nasa lunar|habitat", re.I), "lunar_nasa"),
    (re.compile(r"exploration", re.I), "exploration"),
    (re.compile(r"suit|\beva\b", re.I), "suit"),
    (re.compile(r"earth|\biss\b|cabin|sea level", re.I), "earth_iss"),
]


def scenario_in(text: str):
    return next((sid for rx, sid in SCENARIO_WORDS if rx.search(text)), None)


def route(question: str, db_path=None) -> Route:
    text = scope.normalize(question)
    if scope.hard_block(text):  # injection, jailbreak or unrelated task: fixed refusal, no model
        return Route("fixed", text=scope.REFUSAL_TEXT, no_data=True, guard=True)
    upper = text.upper()
    ids = {m.group(0) for m in TEST_ID_RE.finditer(upper)} | {m.group(1).upper() for m in TEST_WORD_RE.finditer(text)}
    if ids:  # a test ID always wins ("Tell me about FLEX test 20CAL08" is a data query, not "what is FLEX")
        return Route("tool", tool="get_experiment", args={"test_id": sorted(ids)[0]})
    if about.key(text) not in _suggested(db_path):
        topic = about.match_topic(text)
        if topic:  # question about the page itself: fixed text, no model or tools
            return Route("about", about_id=topic, guard=True)
    if re.search(r"relevan", text, re.I) and about.key(text) not in _suggested(db_path):
        sid = scenario_in(text)  # "most relevant tests for X": the tool with the SAME order as the Experiments view
        if sid:
            return Route("tool", tool="most_relevant_tests", args={"scenario_id": sid})
        return Route("about", about_id="relevance_order", guard=True)
    if not scope.has_topic(text):
        if about.generic_site(text):  # reasonable question about the page → about
            return Route("about", about_id="site", guard=True)
        return Route("fixed", text=scope.REFUSAL_TEXT, no_data=True, guard=True)
    if LIVE_RE.search(text):
        return Route("fixed", text=LIVE_TEXT, no_data=True, guard=True)
    if SAFETY_RE.search(text):
        return Route("fixed", text=SAFETY_TEXT, no_data=True, warnings=[T.MICROGRAVITY_NOTE], guard=True)
    fuel = _fuel(text)
    # Parameterised queries, before the generic precomputed answers.
    if re.search(r"extinction diameter|di[aá]metro de extinci[oó]n", text, re.I):
        args = {**({"fuel": fuel} if fuel else {}), **_pressure(text)}
        return Route("tool", tool="q5_extinction_diameter_by_pressure", args=args)
    if re.search(r"(extinction (rate|share|percent)|% (of )?extinction|porcentaje de extinci[oó]n)", text, re.I):
        args = {"fuel": fuel or "methanol", **_pressure(text), **_o2(text)}
        return Route("tool", tool="q1_extinction_rate_by_o2_pressure", args=args)
    if re.search(r"(o2|oxygen|ox[ií]geno) band|by (o2|oxygen)", text, re.I) and re.search(r"bass|material", text, re.I):
        return Route("tool", tool="q6_bass2_outcomes_by_o2_band")
    for rx, answer_id in PRECOMPUTED_RULES:
        if rx.search(text):
            return Route("precomputed", answer_id=answer_id)
    if about.generic_site(text):
        return Route("about", about_id="site", guard=True)
    return Route("fixed", text=scope.REFUSAL_TEXT, no_data=True)  # in scope, no rule: medium/high let the router decide
