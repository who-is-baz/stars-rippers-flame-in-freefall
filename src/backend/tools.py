"""Catálogo de herramientas del asistente: las ÚNICAS acciones que /ask puede ejecutar.

Cada herramienta es una función de src/psi_queries.py (Q1–Q6, list_experiments, get_experiment, meta) o
scenarios.evaluate (que solo usa psi_queries). El modelo elige nombre + argumentos; aquí se validan con Pydantic
y se ejecutan. Las citas (source_doi, test_ids), no_data, avisos y la respuesta de plantilla los calcula el código.
No hay SQL ni shell: un nombre fuera de TOOLS no se ejecuta.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List, Literal, Optional, Type

from pydantic import BaseModel, ConfigDict, Field, model_validator

from . import data

q, sc = data.q, data.sc

MAX_TEST_IDS = 20
PSI_PER_ATM = sc.PSI_PER_ATM
NO_DATA_TEXT = "No data available for that question."
from .scope import REFUSAL_TEXT as OUT_OF_SCOPE_TEXT  # noqa: E402  (una sola definición)
CONFOUND_NOTE = "CO2 and He are confounded with O2 in these tests; no effect can be attributed to a single gas."
NOT_STATED_NOTE = ("BASS-II outcomes were extracted by AI from free-text notes; 'not_stated' does not mean "
                   "the flame did not go out. No extinction percentage is computed for BASS-II.")
DISRUPTION_NOTE = "'Disruption' is not defined by the FLEX Science Documents."
SMALL_N_NOTE = "Some rows have n<5: small sample; read them with caution."
MICROGRAVITY_NOTE = "All tests are microgravity on the ISS; there is no partial-gravity or normal-gravity data."

Fuel = Literal["heptane", "methanol"]
Supp = Literal["any", "none", "co2", "he"]


class Args(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RangeArgs(Args):
    o2_min: Optional[float] = Field(None, ge=0, le=1, description="O2 mole fraction lower bound (0-1, e.g. 0.21)")
    o2_max: Optional[float] = Field(None, ge=0, le=1, description="O2 mole fraction upper bound (0-1)")
    pressure_min: Optional[float] = Field(None, ge=0, le=10, description="pressure lower bound in atm (1 atm = 14.7 psi)")
    pressure_max: Optional[float] = Field(None, ge=0, le=10, description="pressure upper bound in atm")

    @model_validator(mode="after")
    def _order(self):
        for lo, hi in (("o2_min", "o2_max"), ("pressure_min", "pressure_max")):
            a, b = getattr(self, lo), getattr(self, hi)
            if a is not None and b is not None and a > b:
                raise ValueError(f"{lo} must be <= {hi}")
        return self

    def ranges(self) -> dict:
        kw = {}
        if self.o2_min is not None or self.o2_max is not None:
            kw["o2_range"] = (self.o2_min, self.o2_max)
        if self.pressure_min is not None or self.pressure_max is not None:
            kw["pressure_range"] = (self.pressure_min, self.pressure_max)
        return kw


class Q1Args(RangeArgs):
    fuel: Fuel = "methanol"
    suppressant: Supp = "none"


class GasArgs(RangeArgs):
    fuel: Optional[Fuel] = None


class FuelSuppArgs(RangeArgs):
    fuel: Optional[Fuel] = None
    suppressant: Optional[Supp] = None


class Q6Args(Args):
    material: Optional[str] = Field(None, max_length=80, description="exact BASS-II material name from meta")
    o2_min: Optional[float] = Field(None, ge=0, le=1)
    o2_max: Optional[float] = Field(None, ge=0, le=1)


class ListArgs(RangeArgs):
    program: Optional[Literal["FLEX", "BASS-II"]] = None
    fuel: Optional[Fuel] = None
    suppressant: Supp = "any"
    outcome: Optional[Literal["extinction", "disruption", "completion", "blowoff", "no_ignition",
                              "not_sustained", "not_stated"]] = None


class TestArgs(Args):
    test_id: str = Field(..., min_length=2, max_length=20, pattern=r"^[A-Za-z0-9_\-]+$")


class ScenarioArgs(Args):
    scenario_id: Literal["earth_iss", "lunar_challenge", "lunar_nasa", "exploration", "suit"]


class NoArgs(Args):
    pass


@dataclass
class Tool:
    name: str
    description: str
    args: Type[Args]
    run: Callable  # (con, args) -> dict


# --------------------------------------------------------------------------- ejecución
def _q(name: str):
    def run(con, a: Args) -> dict:
        kw = {k: v for k, v in a.model_dump(exclude_none=True).items() if not k.startswith(("o2_", "pressure_"))}
        if isinstance(a, RangeArgs):
            kw.update(a.ranges())
        elif isinstance(a, Q6Args) and (a.o2_min is not None or a.o2_max is not None):
            kw["o2_range"] = (a.o2_min, a.o2_max)
        if isinstance(a, Q6Args) and a.material is not None:
            if a.material not in _bass_materials(con):
                raise ValueError(f"unknown BASS-II material '{a.material}'")
        rows = q.ALL_QUERIES[name](con, **kw)
        ids = q.query_test_ids(con, name, **kw)
        return {"rows": rows, "_ids": ids, "_kw": kw}
    return run


def _bass_materials(con) -> List[str]:
    return next(p["materials"] for p in q.meta(con)["programs"] if p["program"] == "BASS-II")


KEEP = ("program", "test_id", "date", "material_or_fuel", "material_category", "o2_fraction", "pressure_atm",
        "co2_fraction", "he_fraction", "outcome", "outcome_source", "extinction_diameter_mm", "burning_rate_mm2_s",
        "qc_flags", "source_doi", "low_confidence_warning")


def _run_list(con, a: ListArgs) -> dict:
    kw = dict(program=a.program, fuel=a.fuel, suppressant=a.suppressant, outcome=a.outcome, **a.ranges())
    res = q.list_experiments(con, limit=q.MAX_LIMIT, **kw)
    ids: Dict[str, List[str]] = {}
    for r in res["items"]:
        lst = ids.setdefault(r["source_doi"], [])
        if r["test_id"] not in lst:
            lst.append(r["test_id"])
    items = [{k: r.get(k) for k in KEEP if k in r} for r in res["items"][:10]]
    return {"total": res["total"], "items": items, "_ids": ids}


def _run_test(con, a: TestArgs) -> dict:
    rows = q.get_experiment(con, a.test_id.upper()) or q.get_experiment(con, a.test_id)
    ids: Dict[str, List[str]] = {}
    for r in rows:
        ids.setdefault(r["source_doi"], []).append(r["test_id"])
    return {"rows": [{k: r.get(k) for k in KEEP if k in r} for r in rows],
            "_ids": {k: sorted(set(v)) for k, v in ids.items()}}


def _run_scenario(con, a: ScenarioArgs) -> dict:
    r = sc.evaluate(con, sc.get(a.scenario_id))
    pick = r["near"] if r["n_near"] else (r["nearest"] or {"test_ids": []})
    out = {k: r[k] for k in ("id", "label", "criteria", "n_exact", "n_near", "nearest", "source", "verified", "note")}
    out["near"] = {k: v for k, v in r["near"].items() if k != "test_ids"}
    if out["nearest"]:
        out["nearest"] = {k: v for k, v in out["nearest"].items() if k != "test_ids"}
    out["bass2_o2_only"] = r["bass2_o2_only"]
    out["_ids"] = {data.DOI["FLEX"]: list(pick.get("test_ids", []))}
    return out


def _run_meta(con, a: NoArgs) -> dict:
    m = q.meta(con)
    progs = [{k: p[k] for k in ("program", "n", "o2_min", "o2_max", "pressure_min", "pressure_max", "source_doi")}
             for p in m["programs"]]
    return {"programs": progs, "n_tests": sum(p["n"] for p in progs), "min_n": m["min_n"],
            "outcomes": m["outcomes"], "source_doi": m["source_doi"], "_ids": {d: [] for d in m["source_doi"]}}


TOOLS: Dict[str, Tool] = {t.name: t for t in [
    Tool("q1_extinction_rate_by_o2_pressure",
         "FLEX: share of droplet tests that ended in extinction, grouped by pressure (atm) and O2 fraction, for ONE "
         "fuel (default methanol) and suppressant (default none). Descriptive, not a probability.",
         Q1Args, _q("q1_extinction_rate_by_o2_pressure")),
    Tool("q2_co2_effect", "FLEX: tests grouped by CO2 fraction (incl. 0) per fuel and pressure (default ~1 atm), "
                          "with extinction share, mean O2 and mean burning rate. CO2 is confounded with O2.",
         GasArgs, _q("q2_co2_effect")),
    Tool("q3_he_effect", "FLEX: same as q2 but for helium (all pressures by default). He is confounded with O2.",
         GasArgs, _q("q3_he_effect")),
    Tool("q4_burning_rate_by_o2", "FLEX: burning rate K (mm2/s) min/mean/max by fuel and O2 fraction "
                                  "(default ~1 atm, no suppressant). Use to compare heptane vs methanol.",
         FuelSuppArgs, _q("q4_burning_rate_by_o2")),
    Tool("q5_extinction_diameter_by_pressure", "FLEX: droplet diameter at extinction (mm) by fuel and pressure, "
                                               "only tests that ended in extinction.",
         FuelSuppArgs, _q("q5_extinction_diameter_by_pressure")),
    Tool("q6_bass2_outcomes_by_o2_band", "BASS-II solid materials: outcome counts per O2 band (no pressure "
                                         "recorded, no extinction percentage).",
         Q6Args, _q("q6_bass2_outcomes_by_o2_band")),
    Tool("list_experiments", "Count and list individual tests matching filters (program, fuel, O2, pressure in atm, "
                             "suppressant, outcome). Use for 'how many tests...' or 'which tests...'.",
         ListArgs, _run_list),
    Tool("get_experiment", "One test by its test_id (e.g. 20CAL08).", TestArgs, _run_test),
    Tool("scenario", "Count FLEX tests at a named atmosphere: earth_iss (21% O2, 14.7 psi), lunar_challenge "
                     "(>=30% O2, <=10.2 psi, Moon base), lunar_nasa (26.5%, 10.2 psi), exploration (34%, 8.2 psi), "
                     "suit (100%, 4.3 psi). Returns exact and near counts.",
         ScenarioArgs, _run_scenario),
    Tool("meta", "Dataset overview: programs, number of tests, O2 and pressure ranges, DOIs.", NoArgs, _run_meta),
]}


def execute(con, name: str, raw_args: Optional[dict]) -> "ToolResult":
    """Valida y ejecuta. ValueError si el nombre o los argumentos no son válidos (pydantic.ValidationError hereda)."""
    if name not in TOOLS:
        raise ValueError(f"unknown tool '{name}'")
    tool = TOOLS[name]
    args = tool.args.model_validate(raw_args or {})
    res = tool.run(con, args)
    return ToolResult(name, args.model_dump(exclude_none=True), res)


# --------------------------------------------------------------------------- resultado, citas, avisos
class ToolResult:
    def __init__(self, name: str, args: dict, raw: dict):
        self.name, self.args = name, args
        self.ids: Dict[str, List[str]] = raw.pop("_ids", {})
        raw.pop("_kw", None)
        self.result = raw

    @property
    def no_data(self) -> bool:
        r = self.result
        if self.name == "meta":
            return False
        if self.name == "scenario":
            return r["n_near"] == 0
        if self.name == "list_experiments":
            return r["total"] == 0
        return sum(x.get("n", 1) for x in r.get("rows", [])) == 0

    def citations(self) -> List[dict]:
        out = []
        for doi in sorted(self.ids):
            ids = self.ids[doi]
            out.append({"query": self.name, "params": self.args, "source_doi": doi,
                        "test_ids": ids[:MAX_TEST_IDS], "test_ids_total": len(ids)})
        return out

    def rows(self) -> List[dict]:
        r = self.result
        return r.get("rows") or r.get("items") or []

    def warnings(self) -> List[str]:
        w: List[str] = []
        rows = self.rows()
        if any(x.get("warning") for x in rows):
            w.append(q.SMALL_N_WARNING.format(min_n=q.MIN_N))
        elif any(x.get("n", q.MIN_N) < q.MIN_N for x in rows):
            w.append(SMALL_N_NOTE)
        if any(x.get("pct_note") for x in rows):
            w.append(f"Percentages are {q.PCT_NOTE}.")
        if any(x.get("low_confidence_warning") for x in rows):
            w.append(q.LOW_CONFIDENCE_WARNING)
        if self.name in ("q2_co2_effect", "q3_he_effect"):
            w.append(CONFOUND_NOTE)
        if self.name == "q6_bass2_outcomes_by_o2_band" or any(x.get("program") == "BASS-II" for x in rows):
            w.append(NOT_STATED_NOTE)
        if any(x.get("outcome") == "disruption" for x in rows) or (
                self.name == "scenario" and "disruption" in self.result.get("near", {}).get("n_by_outcome", {})):
            w.append(DISRUPTION_NOTE)
        if self.name == "scenario":
            w.append(MICROGRAVITY_NOTE)
        return w

    def for_model(self) -> dict:
        """Lo que ve el modelo al redactar: el resultado sin IDs de prueba (los pone el código)."""
        r = dict(self.result)
        if "rows" in r:
            r["rows"] = r["rows"][:12]
            if len(self.result["rows"]) > 12:
                r["rows_omitted"] = len(self.result["rows"]) - 12
        return {"tool": self.name, "args": self.args, "result": r, "warnings": self.warnings()}


# --------------------------------------------------------------------------- plantillas (deterministas, inglés)
def _f(x, nd=3) -> str:
    if x is None:
        return "n/a"
    if isinstance(x, float):
        s = f"{x:.{nd}f}".rstrip("0").rstrip(".")
        return s or "0"
    return str(x)


def _atm(v) -> str:
    return "no recorded pressure" if v is None else f"{_f(v)} atm"


def _small(r) -> str:
    return " (n<5)" if r.get("n", 99) < q.MIN_N else ""


def _more(rows, shown) -> str:
    return f" ...and {len(rows) - shown} more rows." if len(rows) > shown else ""


def template(tr: ToolResult) -> str:
    """Respuesta sin modelo. Solo usa números del resultado de la herramienta."""
    r, name, rows = tr.result, tr.name, tr.rows()
    if tr.no_data and name != "scenario":
        return NO_DATA_TEXT
    if name == "q1_extinction_rate_by_o2_pressure":
        a = tr.args
        parts = [f"{_f(x['pressure_atm'])} atm, O2 {_f(x['o2_fraction'])}: {x['n_extinction']} of {x['n']} ended in "
                 f"extinction ({_f(x['pct_extinction'], 1)}%){_small(x)}" for x in rows[:6]]
        return (f"FLEX {a.get('fuel', 'methanol')}, suppressant {a.get('suppressant', 'none')}: " + "; ".join(parts)
                + "." + _more(rows, 6) + " Percentages are descriptive, not probabilities.")
    if name in ("q2_co2_effect", "q3_he_effect"):
        gas = "co2" if name == "q2_co2_effect" else "he"
        label = "CO2" if gas == "co2" else "He"
        parts = [f"{x['fuel']} at {_f(x['pressure_atm'])} atm, {label} {_f(x[gas + '_fraction'])}: n={x['n']}, "
                 f"{_f(x['pct_extinction'], 1)}% ended in extinction, mean O2 {_f(x['avg_o2_fraction'])}{_small(x)}"
                 for x in rows[:6]]
        return ("Descriptive counts only: " + "; ".join(parts) + "." + _more(rows, 6) + " " + CONFOUND_NOTE)
    if name == "q4_burning_rate_by_o2":
        parts = [f"{x['fuel']} at O2 {_f(x['o2_fraction'])}: mean burning rate {_f(x['avg_burning_rate_mm2_s'])} mm2/s "
                 f"(min {_f(x['min_burning_rate_mm2_s'])}, max {_f(x['max_burning_rate_mm2_s'])}, n_k={x['n_k']}){_small(x)}"
                 for x in rows[:8]]
        return "FLEX burning rate: " + "; ".join(parts) + "." + _more(rows, 8)
    if name == "q5_extinction_diameter_by_pressure":
        parts = [f"{x['fuel']} at {_atm(x['pressure_atm'])}: "
                 + (f"mean extinction diameter {_f(x['avg_extinction_diameter_mm'])} mm"
                    if x['avg_extinction_diameter_mm'] is not None else "no extinction diameter recorded")
                 + f" (n_d={x['n_d']} of n={x['n']}){_small(x)}" for x in rows[:8]]
        return "FLEX tests that ended in extinction: " + "; ".join(parts) + "." + _more(rows, 8)
    if name == "q6_bass2_outcomes_by_o2_band":
        parts = [f"O2 band {x['o2_band']}: n={x['n']}, low-flow extinction {x['n_low_flow_extinction']}, blowoff "
                 f"{x['n_blowoff']}, no ignition or not sustained {x['n_no_ignition_or_not_sustained']}, outcome not "
                 f"stated {x['n_not_stated']}{_small(x)}" for x in rows]
        return "BASS-II: " + "; ".join(parts) + ". " + NOT_STATED_NOTE
    if name == "list_experiments":
        parts = [f"{x['test_id']} ({x['program']}, {x['material_or_fuel']}, O2 {_f(x['o2_fraction'])}, "
                 f"{_f(x['pressure_atm']) + ' atm' if x.get('pressure_atm') is not None else 'no pressure recorded'}, "
                 f"{x['outcome'] or 'outcome not stated'})" for x in r["items"][:5]]
        return f"{r['total']} tests match. " + ("First: " + "; ".join(parts) + "." if parts else "")
    if name == "get_experiment":
        out = []
        for x in rows:
            p = f"{_f(x['pressure_atm'])} atm" if x.get("pressure_atm") is not None else "no pressure recorded"
            s = (f"{x['program']} test {x['test_id']} ({x['date']}): {x['material_or_fuel']}, O2 "
                 f"{_f(x['o2_fraction'])}, {p}; outcome: {x['outcome'] or 'not stated by the source'}")
            if x.get("burning_rate_mm2_s") is not None:
                s += f"; burning rate {_f(x['burning_rate_mm2_s'])} mm2/s"
            if x.get("outcome") == "extinction" and x.get("extinction_diameter_mm") is not None:
                s += f"; extinction diameter {_f(x['extinction_diameter_mm'])} mm"
            out.append(s + ".")
        return " ".join(out)
    if name == "scenario":
        if r["n_near"] == 0:
            nn = r.get("nearest")
            extra = (f" The closest tested condition is O2 {_f(nn['o2_min'])}-{_f(nn['o2_max'])} at "
                     f"{_f(nn['psi_min'], 2)}-{_f(nn['psi_max'], 2)} psi (n={nn['n']}), which is not this scenario."
                     if nn else "")
            return f"{NO_DATA_TEXT} No FLEX test is near {r['label']}.{extra}"
        n = r["near"]
        outc = ", ".join(f"{k} {v}" for k, v in n["n_by_outcome"].items())
        return (f"{r['label']}: {r['n_exact']} FLEX tests match exactly and {r['n_near']} are near (within "
                f"±0.01 O2 and ±0.5 psi): {_f(n['psi_min'], 2)}-{_f(n['psi_max'], 2)} psi, O2 "
                f"{_f(n['o2_min'])}-{_f(n['o2_max'])}; outcomes: {outc}. These are near tests run in microgravity "
                "on the ISS, not tests of that environment.")
    if name == "meta":
        progs = "; ".join(f"{p['program']} {p['n']} tests (O2 {_f(p['o2_min'])}-{_f(p['o2_max'])})" for p in r["programs"])
        return f"{r['n_tests']} tests from NASA PSI: {progs}. {MICROGRAVITY_NOTE}"
    return NO_DATA_TEXT
