"""API FastAPI de Flame in Freefall (docs/07-api-contract.md).

Rutas bajo /api (contrato). Las mismas rutas también responden en la raíz (sin /api, ocultas del OpenAPI) para
que el frontend, que llama a `<VITE_LLM_URL>/ask`, funcione con VITE_LLM_URL=http://127.0.0.1:8000.

Correr:  uvicorn backend.app:app --app-dir src --host 127.0.0.1 --port 8000
"""
from __future__ import annotations

import hashlib
import logging
import time
from typing import Optional

from fastapi import APIRouter, FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import data
from .config import Settings, get_settings

q = data.q
log = logging.getLogger("flame.api")
if not log.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

QUERY_PARAMS = {  # parámetros que acepta cada consulta (los demás se rechazan con 400)
    "q1_extinction_rate_by_o2_pressure": {"program", "fuel", "o2", "pressure", "suppressant"},
    "q2_co2_effect": {"fuel", "o2", "pressure"},
    "q3_he_effect": {"fuel", "o2", "pressure"},
    "q4_burning_rate_by_o2": {"fuel", "o2", "pressure", "suppressant"},
    "q5_extinction_diameter_by_pressure": {"fuel", "o2", "pressure", "suppressant"},
    "q6_bass2_outcomes_by_o2_band": {"material", "o2"},
}


class ApiError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status, self.detail = status, detail


def rng(lo: Optional[float], hi: Optional[float]):
    if lo is None and hi is None:
        return None
    if lo is not None and hi is not None and lo > hi:
        raise ValueError("min must be <= max")
    return (lo, hi)


def build_kwargs(name: str, *, program=None, fuel=None, material=None, o2_min=None, o2_max=None,
                 pressure_min=None, pressure_max=None, suppressant=None) -> dict:
    """Traduce parámetros de la API a kwargs de psi_queries. Solo pasa lo que llegó (así aplican los defaults)."""
    allowed = QUERY_PARAMS[name]
    given = {"program": program, "fuel": fuel, "material": material, "suppressant": suppressant}
    kw = {}
    for k, v in given.items():
        if v is None:
            continue
        if k not in allowed:
            raise ValueError(f"{name} does not accept '{k}'")
        kw[k] = v
    for key, lo, hi in (("o2", o2_min, o2_max), ("pressure", pressure_min, pressure_max)):
        r = rng(lo, hi)
        if r is not None:
            if key not in allowed:
                raise ValueError(f"{name} does not accept {key}_min/{key}_max")
            kw[f"{key}_range"] = r
    return kw


def create_app(settings: Optional[Settings] = None, llm=None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="Flame in Freefall API", version="1.1.0",
                  description="NASA PSI microgravity combustion data (FLEX PSI-69, BASS-II PSI-25). CC0-1.0. "
                              "Independent project, not endorsed by NASA.")
    app.state.settings = settings
    app.state.llm = llm  # se crea perezosamente en assistant.get_llm()
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_origins), allow_credentials=False,
                       allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type"])

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        t0 = time.perf_counter()
        response = await call_next(request)
        log.info("%s %s -> %s %.0fms", request.method, request.url.path, response.status_code,
                 (time.perf_counter() - t0) * 1000)
        return response

    @app.exception_handler(ApiError)
    async def _api_error(_, e: ApiError):
        return JSONResponse({"detail": e.detail}, status_code=e.status)

    @app.exception_handler(ValueError)
    async def _value_error(_, e: ValueError):
        return JSONResponse({"detail": str(e)}, status_code=400)

    @app.exception_handler(RequestValidationError)
    async def _validation(_, e: RequestValidationError):
        msgs = [f"{'.'.join(str(p) for p in err.get('loc', [])[1:]) or 'body'}: {err.get('msg')}" for err in e.errors()]
        return JSONResponse({"detail": "; ".join(msgs) or "invalid request"}, status_code=400)

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, e: Exception):
        log.error("unhandled %s on %s", type(e).__name__, request.url.path)  # sin traza ni detalle hacia el cliente
        return JSONResponse({"detail": "Internal error."}, status_code=500)

    @app.exception_handler(data.DataUnavailable)
    async def _no_db(_, e: data.DataUnavailable):
        return JSONResponse({"detail": str(e)}, status_code=503)

    router = APIRouter()

    def con():
        return data.connect(settings.db_path or None)

    @router.get("/meta")
    def get_meta():
        c = con()
        try:
            return data.envelope(q.meta(c))
        finally:
            c.close()

    @router.get("/experiments")
    def get_experiments(program: Optional[str] = None, fuel: Optional[str] = None,
                        o2_min: Optional[float] = Query(None, ge=0, le=1), o2_max: Optional[float] = Query(None, ge=0, le=1),
                        pressure_min: Optional[float] = Query(None, ge=0, le=10),
                        pressure_max: Optional[float] = Query(None, ge=0, le=10),
                        suppressant: str = "any", outcome: Optional[str] = None,
                        limit: int = Query(100, ge=1, le=q.MAX_LIMIT), offset: int = Query(0, ge=0)):
        c = con()
        try:
            res = q.list_experiments(c, program=program, fuel=fuel, o2_range=rng(o2_min, o2_max),
                                     pressure_range=rng(pressure_min, pressure_max), suppressant=suppressant,
                                     outcome=outcome, limit=limit, offset=offset)
            return data.envelope(res)
        finally:
            c.close()

    @router.get("/coverage")
    def get_coverage(fuel: Optional[str] = None, suppressant: Optional[str] = None):
        if suppressant is not None and suppressant not in ("none", "co2", "he", "co2+he"):
            raise ValueError("suppressant must be one of none, co2, he, co2+he")
        c = con()
        try:
            cells = q.flex_coverage_grid(c)
        finally:
            c.close()
        cells = [x for x in cells if (fuel is None or x["fuel"] == fuel)
                 and (suppressant is None or x["suppressant"] == suppressant)]
        return data.envelope({"program": "FLEX", "cells": cells}, [data.DOI["FLEX"]])

    @router.get("/queries/{name}")
    def get_query(name: str, program: Optional[str] = None, fuel: Optional[str] = None,
                  material: Optional[str] = None,
                  o2_min: Optional[float] = Query(None, ge=0, le=1), o2_max: Optional[float] = Query(None, ge=0, le=1),
                  pressure_min: Optional[float] = Query(None, ge=0, le=10),
                  pressure_max: Optional[float] = Query(None, ge=0, le=10),
                  suppressant: Optional[str] = None):
        if name not in q.ALL_QUERIES:
            raise ApiError(404, f"unknown query '{name}'; valid: {sorted(q.ALL_QUERIES)}")
        kw = build_kwargs(name, program=program, fuel=fuel, material=material, o2_min=o2_min, o2_max=o2_max,
                          pressure_min=pressure_min, pressure_max=pressure_max, suppressant=suppressant)
        c = con()
        try:
            rows = q.ALL_QUERIES[name](c, **kw)
        finally:
            c.close()
        params = {k: list(v) if isinstance(v, tuple) else v for k, v in kw.items()}
        return data.envelope({"query": name, "params": params, "rows": rows})

    @router.get("/gaps")
    def get_gaps():
        return data.envelope(data.precomputed(settings.db_path or None)["gaps"])

    @router.get("/compare")
    def get_compare(a: str = Query(..., max_length=40), b: str = Query(..., max_length=40)):
        """a y b: `test_id` o `PROGRAM:test_id` (193F001 está repetido en FLEX: vienen ambas filas)."""
        c = con()
        try:
            sides = {}
            for key, ref in (("a", a), ("b", b)):
                program, _, tid = ref.rpartition(":")
                rows = q.get_experiment(c, tid.strip(), program.strip() or None)
                if not rows:
                    raise ApiError(404, f"test_id not found: {ref}")
                sides[key] = rows
        finally:
            c.close()
        ra, rb = sides["a"][0], sides["b"][0]
        keys = [k for k in ra if k not in ("test_id",)]
        same = [k for k in keys if ra.get(k) == rb.get(k)]
        return data.envelope({"a": sides["a"], "b": sides["b"], "same": same,
                              "different": [k for k in keys if k not in same]})

    from . import assistant  # noqa: E402  (registra /ask y /llm/status)
    assistant.register(router, settings)

    app.include_router(router, prefix="/api")
    app.include_router(router, include_in_schema=False)  # alias sin /api para VITE_LLM_URL

    @app.get("/", include_in_schema=False)
    def root():
        return {"name": "Flame in Freefall API", "docs": "/docs", "base": "/api"}

    return app


def question_fingerprint(question: str) -> str:
    """Para el log: longitud y hash corto; nunca la pregunta completa."""
    return f"len={len(question)} sha={hashlib.sha256(question.encode()).hexdigest()[:8]}"


app = create_app()
