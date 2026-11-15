#!/usr/bin/env python3
"""Diagnóstico de Ollama y de los modelos de los tres niveles (Flash / Medium / Heavy).

Por modelo instalado: 1ª llamada (carga en frío) y 2ª (en caliente) a /api/chat con el prompt REAL del router, RAM/VRAM que ocupa
(/api/ps), que solo haya UN modelo cargado, que Qwen3 no "piense" (think:false) y que la salida cumpla el esquema JSON del router.
Uso: python scripts/diagnose_ollama.py [--out docs/bench/diagnostico.json]
Sin Ollama o sin modelos: lo dice y no inventa nada."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import httpx

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "src"))
from backend import pipeline  # noqa: E402
from backend import tools as T  # noqa: E402
from backend.config import get_settings  # noqa: E402
from backend.llm import OllamaClient  # noqa: E402

QUESTION = "Which fuel burns faster, heptane or methanol?"


def ps(url):
    try:
        return httpx.get(f"{url}/api/ps", timeout=3).json().get("models", [])
    except httpx.HTTPError:
        return []


def unload_all(url):
    for m in ps(url):
        httpx.post(f"{url}/api/generate", json={"model": m["name"], "keep_alive": 0}, timeout=60)
    for _ in range(20):
        if not ps(url):
            return
        time.sleep(0.5)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "docs", "bench", "diagnostico.json"))
    args = ap.parse_args()
    s = get_settings()
    llm = OllamaClient(s)
    report = {"ollama_url": s.ollama_url, "version": llm.version(), "models": {}}
    installed = llm.installed_models()
    report["reachable"] = installed is not None
    report["installed"] = installed
    if installed is None:
        print("Ollama no responde en", s.ollama_url)
        json.dump(report, open(args.out, "w"), indent=1)
        return 1
    system = pipeline.ROUTER_SYSTEM % ("", pipeline._catalog())
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": QUESTION}]
    schema = pipeline.router_schema(False)
    for tier, tag in s.tiers.items():
        if tag not in installed and f"{tag}:latest" not in installed:
            report["models"][tag] = {"tier": tier, "installed": False}
            print(f"{tier:6} {tag:14} no descargado")
            continue
        unload_all(s.ollama_url)
        r: dict = {"tier": tier, "installed": True}
        raw_body = {"model": tag, "messages": msgs, "stream": False, "format": schema, "keep_alive": s.keep_alive,
                    "options": {"temperature": 0, "num_ctx": 4096}}
        if tag.startswith("qwen3"):
            raw_body["think"] = False
        t0 = time.perf_counter()
        resp = httpx.post(f"{s.ollama_url}/api/chat", json=raw_body, timeout=s.ollama_timeout_s * 3)
        r["cold_ms"] = int((time.perf_counter() - t0) * 1000)
        msg = resp.json().get("message", {}) if resp.status_code == 200 else {}
        r["status"] = resp.status_code
        r["thinking_field_present"] = bool(msg.get("thinking"))
        r["think_tag_in_content"] = "<think>" in (msg.get("content") or "")
        loaded = ps(s.ollama_url)
        r["loaded_models"] = [m["name"] for m in loaded]
        r["ram_gb"] = round(sum(m.get("size", 0) for m in loaded) / 1e9, 2)
        r["vram_gb"] = round(sum(m.get("size_vram", 0) for m in loaded) / 1e9, 2)
        t0 = time.perf_counter()
        out = llm.chat(tag, msgs, schema)  # camino real del backend (misma configuración)
        r["warm_ms"] = int((time.perf_counter() - t0) * 1000)
        try:
            obj = json.loads(out)
            tool = obj.get("tool")
            r["json_valid"] = True
            r["tool"] = tool
            r["tool_known"] = tool in T.TOOLS or tool == "none"
            r["args"] = obj.get("args")
        except ValueError:
            r["json_valid"] = False
            r["raw"] = out[:200]
        report["models"][tag] = r
        print(f"{tier:6} {tag:14} frío {r['cold_ms']/1000:6.1f}s  caliente {r['warm_ms']/1000:5.1f}s  RAM {r['ram_gb']} GB (VRAM {r['vram_gb']} GB)  "
              f"cargados={r['loaded_models']}  JSON={'ok' if r['json_valid'] else 'MAL'}  tool={r.get('tool')}  think-field={r['thinking_field_present']}")
    unload_all(s.ollama_url)
    json.dump(report, open(args.out, "w"), indent=1, ensure_ascii=False)
    print("guardado", os.path.relpath(args.out, ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
