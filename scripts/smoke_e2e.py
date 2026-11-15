#!/usr/bin/env python3
"""Smoke test de punta a punta: levanta la API (uvicorn) y el front (vite dev), y hace una pregunta por nivel.

Uso (desde la raíz, con el .venv activo y `npm install` hecho en frontend/):
    python scripts/smoke_e2e.py                    # Ollama opcional: sin Ollama, Flash/Medium/Heavy deben dar 503
    python scripts/smoke_e2e.py --require-ollama   # falla si algún nivel con modelo no responde 200

Comprueba: front sirve index.html y data/answers.json; CORS desde http://127.0.0.1:5173; forma de /ask
(answer, citations[{query, params, source_doi, test_ids ≤ 20, test_ids_total}], tool_calls, no_data,
meta{level, model, mode, ms, warnings}); /llm/status; 503 con detail si no hay modelo.
Sin red externa: solo localhost.
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
API = "http://127.0.0.1:8765"
FRONT = "http://127.0.0.1:5173"
ORIGIN = FRONT
# Mapa de la interfaz (frontend/src/assistant/engine.ts): Basic=low; Flash=medium+FLASH; Medium=medium+MEDIUM; Heavy=high+HEAVY
LEVELS = [("Basic", "low", None), ("Flash", "medium", "flash"), ("Medium", "medium", "medium"), ("Heavy", "high", "heavy")]
QUESTION = "Are there tests at the expected Moon-base air (30% O2 or more, 10.2 psi or less)?"


def http(method, url, body=None, headers=None, timeout=120):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def wait(url, seconds=40):
    t0 = time.time()
    while time.time() - t0 < seconds:
        try:
            if http("GET", url, timeout=2)[0] < 500:
                return True
        except OSError:
            time.sleep(0.5)
    return False


def check_shape(b: dict, level: str):
    assert isinstance(b["answer"], str) and b["answer"], "answer"
    assert isinstance(b["no_data"], bool) and isinstance(b["tool_calls"], list)
    for c in b["citations"]:
        assert set(c) >= {"query", "params", "source_doi", "test_ids", "test_ids_total"}, c.keys()
        assert len(c["test_ids"]) <= 20 and c["test_ids_total"] >= len(c["test_ids"])
    m = b["meta"]
    assert m["level"] == level and m["mode"] in ("low", "ollama", "fallback") and isinstance(m["ms"], int)
    assert isinstance(m["warnings"], list)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--require-ollama", action="store_true")
    args = ap.parse_args()
    env = {**os.environ, "CORS_ORIGINS": ""}
    procs = []
    fails = 0
    try:
        procs.append(subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.app:app", "--app-dir", "src",
                                       "--host", "127.0.0.1", "--port", "8765", "--log-level", "warning"],
                                      cwd=ROOT, env=env))
        procs.append(subprocess.Popen(["npm", "run", "dev", "--silent"], cwd=os.path.join(ROOT, "frontend"),
                                      env={**env, "VITE_LLM_URL": API}, stdout=subprocess.DEVNULL,
                                      stderr=subprocess.DEVNULL, start_new_session=True))
        assert wait(f"{API}/api/meta"), "API did not start"
        assert wait(f"{FRONT}/"), "front did not start"
        st, _, html = http("GET", f"{FRONT}/")
        assert st == 200 and b"<div id=\"root\"" in html, "front index"
        st, _, ans = http("GET", f"{FRONT}/data/answers.json")
        assert st == 200 and json.loads(ans)["answers"], "front answers.json"
        print("OK  front serves index.html and data/answers.json")

        st, h, _ = http("OPTIONS", f"{API}/ask", headers={"Origin": ORIGIN, "Access-Control-Request-Method": "POST",
                                                           "Access-Control-Request-Headers": "content-type"})
        assert h.get("access-control-allow-origin") == ORIGIN, f"CORS preflight: {st} {h}"
        print("OK  CORS preflight from", ORIGIN)

        st, _, raw = http("GET", f"{API}/llm/status", headers={"Origin": ORIGIN})
        status = json.loads(raw)
        assert st == 200 and {"available", "ollama_url", "models"} <= set(status)
        tags = {m["tier"]: m for m in status["models"]}
        print(f"OK  /llm/status available={status['available']} "
              + ", ".join(f"{m['tier']}={m['tag']}{'' if m['installed'] else ' (not installed)'}" for m in status["models"]))

        for label, level, tier in LEVELS:
            body = {"question": QUESTION, "level": level}
            if tier:
                body["model"] = tags[tier]["tag"]
            t0 = time.time()
            st, h, raw = http("POST", f"{API}/ask", body, headers={"Origin": ORIGIN})
            dt = time.time() - t0
            b = json.loads(raw)
            if st == 200:
                check_shape(b, level)
                print(f"OK  {label:6} {level:6} 200 mode={b['meta']['mode']:8} no_data={b['no_data']} "
                      f"{dt:5.1f}s  {b['answer'][:90]}")
            elif st == 503 and tier and not args.require_ollama:
                assert "detail" in b
                print(f"OK  {label:6} {level:6} 503 (front falls back to Basic): {b['detail'][:80]}")
            else:
                fails += 1
                print(f"FAIL {label} {level} {st}: {raw[:200]!r}")
    except AssertionError as e:
        fails += 1
        print("FAIL", e)
    finally:
        for p in procs:
            try:
                os.killpg(p.pid, signal.SIGTERM) if p.args[0] == "npm" else p.terminate()
            except ProcessLookupError:
                pass
        for p in procs:
            try:
                p.wait(timeout=10)
            except subprocess.TimeoutExpired:
                p.kill()
    print("SMOKE", "FAILED" if fails else "PASSED")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
