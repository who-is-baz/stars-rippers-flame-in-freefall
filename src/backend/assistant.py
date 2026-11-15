"""POST /ask y GET /llm/status (docs/07-api-contract.md, sección /ask).

Niveles: low = reglas + plantilla (sin Ollama, red de seguridad); medium = un modelo elige UNA herramienta y
redacta; high = hasta 3 pasos de herramientas, redacta y se verifica. Las citas, test_ids y no_data los calcula
el código. Si Ollama no está o falla en medium/high → 503 (el frontend cae a Basic).
"""
from __future__ import annotations

import collections
import hashlib
import logging
import threading
import time
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from . import data, low
from . import tools as T
from .config import Settings
from .llm import LlmUnavailable  # noqa: F401  (Ollama no responde / modelo no instalado → 503)

log = logging.getLogger("flame.ask")
MAX_QUESTION = 500


class RateLimiter:
    """Ventana deslizante de 60 s por IP, en memoria (el backend corre solo en la laptop del demo)."""

    def __init__(self, per_min: int):
        self.per_min, self.hits, self.lock = per_min, collections.defaultdict(collections.deque), threading.Lock()

    def allow(self, ip: str) -> bool:
        if self.per_min <= 0:
            return True
        now = time.monotonic()
        with self.lock:
            q = self.hits[ip]
            while q and now - q[0] > 60:
                q.popleft()
            if len(q) >= self.per_min:
                return False
            q.append(now)
            return True


class AskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(..., min_length=1, max_length=MAX_QUESTION)
    level: Literal["low", "medium", "high"] = "low"
    model: Optional[str] = Field(None, max_length=60)

    @field_validator("question")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("question is empty")
        return v


class Citation(BaseModel):
    query: str
    params: Dict[str, Any]
    source_doi: str
    test_ids: List[str]
    test_ids_total: int


class AskMeta(BaseModel):
    level: str
    model: Optional[str]
    mode: Literal["low", "ollama", "fallback"]
    ms: int
    warnings: List[str]
    kind: Optional[str] = None          # "about" = respuesta fija sobre la propia página (cita una sección, no un dataset)
    section: Optional[str] = None
    suggestions: List[str] = []          # preguntas sugeridas (negativa, saludo, "what can you do")


class AskResponse(BaseModel):
    answer: str
    citations: List[Citation]
    tool_calls: List[Dict[str, Any]]
    no_data: bool
    meta: AskMeta




def _dedupe(xs: List[str]) -> List[str]:
    return list(dict.fromkeys(x for x in xs if x))


def _cite_precomputed(cits: List[dict]) -> List[dict]:
    out = []
    for c in cits:
        ids = list(c.get("test_ids") or [])
        out.append({"query": c["query"], "params": c.get("params") or {}, "source_doi": c["source_doi"],
                    "test_ids": ids[:T.MAX_TEST_IDS], "test_ids_total": len(ids)})
    return out


def answer_low(con, question: str, db_path: Optional[str] = None) -> dict:
    """Respuesta sin modelo. Devuelve {answer, citations, tool_calls, no_data, warnings}."""
    r = low.route(question, db_path)
    if r.kind == "about":
        from . import about
        facts = data.site_facts(con, db_path)
        sug = about.SUGGESTIONS if r.about_id in ("greeting", "capabilities") else []
        return {"answer": about.render(r.about_id, facts), "citations": [], "tool_calls": [{"tool": "about", "id": r.about_id}],
                "no_data": False, "warnings": [], "kind": "about", "section": about.section(r.about_id), "suggestions": sug}
    if r.kind == "fixed":
        from . import about, scope
        return {"answer": r.text, "citations": [], "tool_calls": [], "no_data": r.no_data, "warnings": r.warnings,
                "suggestions": about.SUGGESTIONS if r.text == scope.REFUSAL_TEXT else []}
    if r.kind == "precomputed":
        ans = next(a for a in data.precomputed(db_path)["answers"]["answers"] if a["id"] == r.answer_id)
        return {"answer": ans["answer"], "citations": _cite_precomputed(ans["citations"]),
                "tool_calls": [{"tool": "precomputed", "id": ans["id"], "source": "answers.json"}],
                "no_data": ans["no_data"], "warnings": list(ans.get("warnings") or [])}
    try:
        tr = T.execute(con, r.tool, r.args)
    except ValueError:
        return {"answer": T.NO_DATA_TEXT, "citations": [], "tool_calls": [], "no_data": True, "warnings": []}
    return result_from_tools([tr], T.template(tr))


def result_from_tools(trs: List["T.ToolResult"], answer: str, extra_warnings: Optional[List[str]] = None) -> dict:
    """Arma citas, tool_calls, no_data y avisos desde los resultados (código, nunca el modelo)."""
    no_data = all(tr.no_data for tr in trs) if trs else True
    # Citas solo de resultados con pruebas (o de meta, que cita los dos DOI sin IDs).
    cits = [c for tr in trs for c in tr.citations() if c["test_ids_total"] > 0 or tr.name == "meta"]
    if no_data and not answer.startswith(T.NO_DATA_TEXT):
        answer = T.NO_DATA_TEXT
    calls = [{"tool": tr.name, "args": tr.args, "no_data": tr.no_data} for tr in trs]
    warns = _dedupe([w for tr in trs for w in tr.warnings()] + list(extra_warnings or []))
    return {"answer": answer, "citations": cits, "tool_calls": calls, "no_data": no_data, "warnings": warns}


def get_llm(request: Request, settings: Settings):
    llm = request.app.state.llm
    if llm is None:
        from .llm import OllamaClient
        llm = request.app.state.llm = OllamaClient(settings)
    return llm


def register(router: APIRouter, settings: Settings) -> None:
    limiter = RateLimiter(settings.ask_rate_per_min)

    @router.get("/llm/status")
    def llm_status(request: Request):
        llm = get_llm(request, settings)
        installed = llm.installed_models()  # None si Ollama no responde
        models = [{"tag": tag, "tier": tier, "installed": bool(installed) and _is_installed(tag, installed)}
                  for tier, tag in settings.tiers.items()]
        return {"available": installed is not None, "ollama_url": settings.ollama_url, "models": models}

    @router.post("/ask", response_model=AskResponse)
    def ask(body: AskRequest, request: Request):
        ip = request.client.host if request.client else "unknown"
        if not limiter.allow(ip):
            return JSONResponse({"detail": "Too many requests; wait a minute."}, status_code=429, headers={"Retry-After": "60"})
        t0 = time.perf_counter()
        fp = f"len={len(body.question)} sha={hashlib.sha256(body.question.encode()).hexdigest()[:8]}"
        if body.model is not None and body.model not in settings.allowed_models():
            return JSONResponse({"detail": f"model must be one of {settings.allowed_models()}"}, status_code=400)
        con = data.connect(settings.db_path or None)
        try:
            if body.level == "low":
                out, mode, model = answer_low(con, body.question, settings.db_path or None), "low", None
            else:
                from . import pipeline
                model = body.model or settings.default_model(body.level)
                try:
                    out, mode = pipeline.answer(get_llm(request, settings), con, body.question, body.level, model,
                                                settings)
                except LlmUnavailable as e:
                    log.warning("ask %s level=%s model=%s -> 503 (%s)", fp, body.level, model, e)
                    return JSONResponse({"detail": f"LLM unavailable: {e}"}, status_code=503)
        finally:
            con.close()
        ms = int((time.perf_counter() - t0) * 1000)
        log.info("ask %s level=%s model=%s mode=%s no_data=%s tools=%s %dms", fp, body.level, model, mode,
                 out["no_data"], [c["tool"] for c in out["tool_calls"]], ms)
        return {"answer": out["answer"], "citations": out["citations"], "tool_calls": out["tool_calls"],
                "no_data": out["no_data"],
                "meta": {"level": body.level, "model": model, "mode": mode, "ms": ms, "warnings": out["warnings"],
                         "kind": out.get("kind"), "section": out.get("section"), "suggestions": out.get("suggestions", [])}}


def _is_installed(tag: str, installed: List[str]) -> bool:
    want = tag if ":" in tag else f"{tag}:latest"
    return want in installed or tag in installed
