"""Verificación posterior (en código) del texto que redacta el modelo. Si algo falla, se usa la plantilla.

(a) Números: todo número del texto debe salir del resultado de la herramienta. Tolerancia de redondeo: un número
    escrito con d decimales coincide con un valor v si round(v, d) == número (así "75%" acepta 75.0 y "0.5 mm2/s"
    acepta 0.501, pero "0.6" no acepta 0.501). También se aceptan v×100 (fracción → %) y v×14.6959 (atm → psi).
    Se ignoran los dígitos pegados a letras (O2, CO2, mm2), los DOI y los test_id.
(b) Frases prohibidas: seguridad, predicción, futuro, gravedad lunar/marciana, causalidad de un solo gas.
(c) Las pruebas del escenario se llaman "near", nunca "lunar".
(d) n<5: si hay filas con n<5 y el texto da un porcentaje, el texto debe decir n<5 (o "small sample").
(e) Inglés y ≤ 3 frases. Citas y no_data no se verifican aquí porque nunca vienen del modelo.
"""
from __future__ import annotations

import re
from typing import Iterable, List, Set

from . import tools as T

PSI_PER_ATM = T.PSI_PER_ATM
ALWAYS_ALLOWED = {5.0, 14.7, 0.01, 0.5}  # MIN_N, 1 atm en psi, tolerancias de scenarios.py
MAX_SENTENCES = 3
MAX_CHARS = 600
URL_RE = re.compile(r"(https?://|www\.)", re.I)
MARKDOWN_RE = re.compile(r"(\*\*|`|^#|\[[^\]]+\]\()", re.M)

NUM_RE = re.compile(r"(?<![A-Za-z0-9.])(\d+(?:\.\d+)?)(?![0-9])")
DOI_RE = re.compile(r"10\.\d{4,9}/[^\s,;)]+")
TESTID_RE = re.compile(r"\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{5,}\b")
PSI_ID_RE = re.compile(r"\bPSI-\d+\b", re.I)

GAS = r"(co2|co₂|carbon dioxide|helium|\bhe\b|oxygen|o2|o₂)"
CAUSAL = (r"(causes?|caused|leads? to|results? in|reduces?|increases?|lowers?|raises?|suppress(es)?|"
          r"extinguish(es)?|puts? out|prevents?|makes?|slows?|speeds? up)")
BANNED = [
    (re.compile(r"\b(safe|safer|safest|safely|unsafe)\b", re.I), "safety claim"),
    (re.compile(r"\bdanger(ous)?\b", re.I), "safety claim"),
    (re.compile(r"\b(will|would|going to)\b", re.I), "prediction"),
    (re.compile(r"\b(predict\w*|forecast\w*|likely|likelihood|guarantee\w*|expected to)\b", re.I), "prediction"),
    (re.compile(r"\b(on|in|at) (the )?(moon|mars|lunar surface|martian surface)\b", re.I), "claim about the Moon/Mars"),
    (re.compile(r"\b(lunar|martian|moon|mars|partial|normal|earth)[- ]gravity\b", re.I), "claim about non-microgravity"),
    (re.compile(GAS + r"[^.]{0,60}?\b" + CAUSAL + r"\b", re.I), "causal claim about a single gas"),
    (re.compile(r"\b(because of|due to|thanks to)\b", re.I), "causal claim"),
    (re.compile(r"\bprobabilit(y|ies)\b", re.I), "probability"),
    (re.compile(r"\blunar (tests?|experiments?|conditions?|data|runs?)\b|\b\d+ lunar\b", re.I), "near tests called lunar"),
    (re.compile(r"\b(recommend\w*|should use|official)\b", re.I), "recommendation"),
]
NEGATED_PROB = re.compile(r"not (a |as )?probabilit(y|ies)", re.I)
SPANISH = re.compile(r"\b(el|los|las|del|que|es|una|pruebas|combustible|seguro|segura|oxígeno|presión|datos|no hay)\b",
                     re.I)


def numbers_in(obj) -> Set[float]:
    out: Set[float] = set()

    def walk(x):
        if isinstance(x, bool):
            return
        if isinstance(x, (int, float)):
            out.add(float(x))
        elif isinstance(x, str):
            for m in NUM_RE.finditer(DOI_RE.sub(" ", x)):
                out.add(float(m.group(1)))
        elif isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, (list, tuple)):
            for v in x:
                walk(v)
            out.add(float(len(x)))

    walk(obj)
    return out


def _matches(token: str, allowed: Iterable[float]) -> bool:
    x = float(token)
    d = len(token.split(".")[1]) if "." in token else 0
    for v in allowed:
        for cand in (v, v * 100, v * PSI_PER_ATM):
            if round(cand, d) == round(x, d) or abs(cand - x) < 1e-9:
                return True
    return False


def unknown_numbers(answer: str, allowed: Set[float]) -> List[str]:
    text = PSI_ID_RE.sub(" ", TESTID_RE.sub(" ", DOI_RE.sub(" ", answer)))
    allowed = set(allowed) | ALWAYS_ALLOWED
    return [m.group(1) for m in NUM_RE.finditer(text) if not _matches(m.group(1), allowed)]


def sentences(answer: str) -> int:
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z])", answer.strip())
    return len([p for p in parts if p.strip()])


def check(answer: str, results: List["T.ToolResult"]) -> List[str]:
    """Lista de problemas (vacía = aprobado)."""
    problems: List[str] = []
    a = (answer or "").strip()
    if not a:
        return ["empty answer"]
    allowed: Set[float] = set()
    for tr in results:
        allowed |= numbers_in(tr.result)
        allowed |= numbers_in(tr.args)
        allowed |= {float(c["test_ids_total"]) for c in tr.citations()}
    bad = unknown_numbers(a, allowed)
    if bad:
        problems.append(f"numbers not in the tool result: {', '.join(bad)}")
    text = NEGATED_PROB.sub(" ", a)
    for rx, why in BANNED:
        m = rx.search(text)
        if m:
            problems.append(f"{why}: '{m.group(0)}'")
    if any(tr.name == "scenario" and tr.result.get("n_near", 0) > 0 for tr in results):
        if not re.search(r"\bnear\b", a, re.I):
            problems.append("scenario tests must be called 'near'")
    small = any(x.get("n", T.q.MIN_N) < T.q.MIN_N for tr in results for x in tr.rows())
    if small and "%" in a and not re.search(r"n\s*<\s*5|small sample", a, re.I):
        problems.append("percentage with n<5 rows but no n<5 warning")
    known_ids = {i.upper() for tr in results for ids in tr.ids.values() for i in ids}
    for tid in TESTID_RE.findall(a):
        if any(ch.isdigit() for ch in tid) and tid.upper() not in known_ids and not re.fullmatch(r"\d+(st|nd|rd|th)", tid, re.I):
            problems.append(f"test ID not in the tool result: {tid}")
    if URL_RE.search(a) or MARKDOWN_RE.search(a):
        problems.append("links or markdown are not allowed")
    if len(a) > MAX_CHARS:
        problems.append(f"answer longer than {MAX_CHARS} characters")
    if len(SPANISH.findall(a)) >= 2:
        problems.append("answer is not in English")
    if sentences(a) > MAX_SENTENCES:
        problems.append(f"more than {MAX_SENTENCES} sentences")
    return problems
