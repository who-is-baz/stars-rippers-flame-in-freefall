#!/usr/bin/env python3
"""Benchmark de modelos locales (Ollama) para elegir los niveles Flash / Medium / Heavy con evidencia.

Uso (desde la raíz, con Ollama corriendo y los modelos descargados):
    python scripts/bench_models.py                       # modelos de FLASH_MODEL, MEDIUM_MODEL, HEAVY_MODEL
    python scripts/bench_models.py --models llama3.2:3b qwen3:8b

Corre las 12 preguntas de BATTERY (no existe aún el archivo de 12 preguntas de Fer; ver docs/bench/RESUMEN.md)
contra cada modelo a través del pipeline real de /ask (FastAPI TestClient, sin servidor). Por modelo y pregunta
anota: herramienta correcta, argumentos correctos, si el verificador rechazó el texto (números inventados o frases
prohibidas), no_data correcto, tiempo (ms) y pico de RAM/VRAM del modelo (GET /api/ps de Ollama, muestreado).
Escribe docs/bench/results.csv y docs/bench/RESUMEN.md. Modelo no descargado → se salta y se dice.
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
import threading
import time
from typing import Callable, Dict, List, Optional

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "src"))
from fastapi.testclient import TestClient  # noqa: E402

from backend.app import create_app  # noqa: E402
from backend.config import get_settings  # noqa: E402
from backend.llm import OllamaClient  # noqa: E402

OUT = os.path.join(ROOT, "docs", "bench")


def _near(v, target, tol):
    return v is not None and abs(v - target) <= tol


# (id, tipo, nivel, pregunta, herramientas aceptadas, chequeo de argumentos, no_data esperado)
BATTERY: List[dict] = [
    dict(id="b01", kind="normal", level="medium", q="Which fuel burns faster, heptane or methanol?",
         tools={"q4_burning_rate_by_o2"}, args=lambda a: True, no_data=False),
    dict(id="b02", kind="normal", level="medium", q="What share of methanol tests ended in extinction at 1 atm?",
         tools={"q1_extinction_rate_by_o2_pressure"},
         args=lambda a: a.get("fuel", "methanol") == "methanol" and (
             a.get("pressure_min") is None or a["pressure_min"] <= 1.0 <= (a.get("pressure_max") or 9)), no_data=False),
    dict(id="b03", kind="normal", level="medium", q="What was the droplet extinction diameter for heptane at each pressure?",
         tools={"q5_extinction_diameter_by_pressure"}, args=lambda a: a.get("fuel") == "heptane", no_data=False),
    dict(id="b04", kind="normal", level="medium", q="How did BASS-II solid material tests end in each oxygen band?",
         tools={"q6_bass2_outcomes_by_o2_band"}, args=lambda a: True, no_data=False),
    dict(id="b05", kind="normal", level="medium", q="How many FLEX tests used helium?",
         tools={"list_experiments", "q3_he_effect"},
         args=lambda a: a.get("suppressant", "he") == "he" or "fuel" in a or a == {}, no_data=False),
    dict(id="b06", kind="normal", level="medium", q="Tell me about FLEX test 20CAL08.",
         tools={"get_experiment"}, args=lambda a: str(a.get("test_id", "")).upper() == "20CAL08", no_data=False),
    dict(id="b07", kind="normal", level="medium", q="Are there tests at Earth / ISS cabin air, 21% oxygen and 14.7 psi?",
         tools={"scenario"}, args=lambda a: a.get("scenario_id") == "earth_iss", no_data=False),
    dict(id="b08", kind="normal", level="medium", q="Is there data for the expected Moon-base air of 30% oxygen at 10.2 psi?",
         tools={"scenario"}, args=lambda a: a.get("scenario_id") == "lunar_challenge", no_data=False),
    dict(id="b09", kind="trap", level="medium", q="What happens to a candle flame in lunar gravity?",
         tools={"(guard)"}, args=lambda a: True, no_data=True),
    dict(id="b10", kind="trap", level="medium", q="Which fuel is safer for a Moon habitat, heptane or methanol?",
         tools={"(guard)"}, args=lambda a: True, no_data=True),
    dict(id="b11", kind="co2_o2", level="medium", q="Does adding CO2 change extinction when oxygen is around 21%?",
         tools={"q2_co2_effect"}, args=lambda a: a.get("o2_min") is None or a["o2_min"] <= 0.21, no_data=False),
    dict(id="b12", kind="two_step", level="high",
         q="Compare the burning rates of heptane and methanol, then list the FLEX tests above 2 atm where data is thin.",
         tools={"q4_burning_rate_by_o2", "list_experiments"}, args=lambda a: True, no_data=False),
]


class RamSampler(threading.Thread):
    """Muestrea /api/ps cada 0.5 s y guarda el máximo de memoria del modelo (size = RAM+VRAM)."""

    def __init__(self, llm: OllamaClient, model: str):
        super().__init__(daemon=True)
        self.llm, self.model, self.peak, self.stop = llm, model, 0, threading.Event()

    def run(self):
        while not self.stop.is_set():
            for m in self.llm.running():
                if m.get("name") == self.model or m.get("model") == self.model:
                    self.peak = max(self.peak, int(m.get("size") or 0))
            self.stop.wait(0.5)


def run_one(client: TestClient, model: str, item: dict) -> dict:
    t0 = time.perf_counter()
    r = client.post("/api/ask", json={"question": item["q"], "level": item["level"], "model": model})
    ms = int((time.perf_counter() - t0) * 1000)
    row = {"model": model, "id": item["id"], "kind": item["kind"], "level": item["level"], "status": r.status_code,
           "ms": ms}
    if r.status_code != 200:
        return {**row, "tool_ok": False, "args_ok": False, "verifier_flag": "", "no_data_ok": False,
                "mode": "error", "tools": "", "answer": r.text[:200]}
    b = r.json()
    calls = [c for c in b["tool_calls"] if c.get("tool") not in (None, "precomputed")]
    used = [c["tool"] for c in calls]
    guard = any("deterministic guard" in w for w in b["meta"]["warnings"])
    if "(guard)" in item["tools"]:
        tool_ok = guard or used == ["none"]
        args_ok = tool_ok
    elif item["kind"] == "two_step":
        tool_ok = item["tools"] <= set(used)
        args_ok = tool_ok
    else:
        tool_ok = bool(used) and used[0] in item["tools"]
        args_ok = tool_ok and bool(item["args"](calls[0].get("args") or {}))
    flags = [w for w in b["meta"]["warnings"] if w.startswith("Model text failed verification")]
    rule_fallback = any("did not produce a valid tool call" in w for w in b["meta"]["warnings"])
    return {**row, "tool_ok": tool_ok, "args_ok": args_ok,
            "verifier_flag": (flags[0][len("Model text failed verification ("):][:160] if flags
                              else ("invalid tool call → rules" if rule_fallback else "")),
            "no_data_ok": b["no_data"] == item["no_data"], "mode": b["meta"]["mode"], "tools": "+".join(used),
            "answer": b["answer"][:200]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*")
    args = ap.parse_args()
    settings = get_settings()
    llm = OllamaClient(settings)
    installed = llm.installed_models()
    wanted = args.models or settings.allowed_models()
    os.makedirs(OUT, exist_ok=True)
    rows: List[dict] = []
    skipped: Dict[str, str] = {}
    peaks: Dict[str, int] = {}
    if installed is None:
        skipped = {m: f"Ollama not reachable at {settings.ollama_url}" for m in wanted}
    for model in wanted:
        if installed is None:
            break
        if model not in installed and f"{model}:latest" not in installed:
            skipped[model] = f"not downloaded (ollama pull {model})"
            continue
        # el modelo puede no estar en la lista permitida si se pasa por --models: se habilita para esta corrida
        tiers = dict(settings.tiers)
        if model not in tiers.values():
            tiers[f"bench_{model}"] = model
        s2 = type(settings)(**{**settings.__dict__, "tiers": tiers})
        client = TestClient(create_app(settings=s2, llm=OllamaClient(s2)))
        sampler = RamSampler(llm, model)
        sampler.start()
        for item in BATTERY:
            row = run_one(client, model, item)
            rows.append(row)
            print(f"{model:14} {item['id']} tool={row['tool_ok']!s:5} args={row['args_ok']!s:5} "
                  f"nd={row['no_data_ok']!s:5} mode={row['mode']:8} {row['ms']:6}ms {row['verifier_flag'][:50]}")
        sampler.stop.set()
        sampler.join()
        peaks[model] = sampler.peak
    fields = ["model", "id", "kind", "level", "status", "tool_ok", "args_ok", "verifier_flag", "no_data_ok", "mode",
              "tools", "ms", "answer"]
    with open(os.path.join(OUT, "results.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k) for k in fields})
    write_summary(rows, skipped, peaks)
    return 0


def write_summary(rows: List[dict], skipped: Dict[str, str], peaks: Dict[str, int]) -> None:
    by: Dict[str, List[dict]] = {}
    for r in rows:
        by.setdefault(r["model"], []).append(r)
    lines = ["# Benchmark de modelos locales (generado por `scripts/bench_models.py`)", "",
             f"Fecha: {time.strftime('%Y-%m-%d %H:%M')}. Batería de 12 preguntas (8 normales, 2 trampa, 1 CO₂+O₂, "
             "1 de dos pasos en `high`), definida en `BATTERY` porque el archivo de 12 preguntas de Fer no existe aún.",
             "", "| Modelo | Herramienta ok | Args ok | no_data ok | Texto verificado (ollama) | Fallback | "
                 "Errores | Mediana ms | Máx ms | Pico memoria |",
             "|---|---|---|---|---|---|---|---|---|---|"]
    for model, rs in by.items():
        ms = sorted(r["ms"] for r in rs)
        cnt = lambda k: sum(1 for r in rs if r[k])  # noqa: E731
        lines.append(f"| `{model}` | {cnt('tool_ok')}/12 | {cnt('args_ok')}/12 | {cnt('no_data_ok')}/12 | "
                     f"{sum(r['mode'] == 'ollama' for r in rs)} | {sum(r['mode'] == 'fallback' for r in rs)} | "
                     f"{sum(r['mode'] == 'error' for r in rs)} | {ms[len(ms) // 2]} | {ms[-1]} | "
                     f"{peaks.get(model, 0) / 1e9:.1f} GB |")
    for m, why in skipped.items():
        lines.append(f"| `{m}` | — | — | — | — | — | — | — | — | saltado: {why} |")
    lines += ["", "## Recomendación", ""]
    if not by:
        lines.append("**Sin resultados**: ningún modelo se pudo correr en esta máquina (ver la tabla). "
                     "No se recomienda nada sin evidencia; correr de nuevo en la laptop del demo.")
    else:
        score = {m: (sum(r["tool_ok"] and r["args_ok"] and r["no_data_ok"] for r in rs), -sorted(r["ms"] for r in rs)[6])
                 for m, rs in by.items()}
        ranked = sorted(score, key=lambda m: score[m], reverse=True)
        lines.append("Orden por aciertos completos (herramienta + argumentos + no_data) y luego por mediana de tiempo: "
                     + ", ".join(f"`{m}` ({score[m][0]}/12)" for m in ranked) + ".")
        lines.append("Regla: Flash = el más rápido con ≥ 9/12; Heavy = el de más aciertos si su mediana cabe en el "
                     "timeout del front (15 s, `VITE_LLM_TIMEOUT_MS`); se descarta el que tenga < 8/12 o errores. "
                     "**Revisar a mano la columna `answer` de results.csv antes de decidir.**")
    lines += ["", "Columnas de `results.csv`: `verifier_flag` = motivo por el que el verificador rechazó el texto del "
                  "modelo (números inventados, frase prohibida, etc.); `mode` = ollama | fallback | low | error."]
    with open(os.path.join(OUT, "RESUMEN.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    sys.exit(main())
