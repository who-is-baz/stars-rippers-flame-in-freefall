"""Cliente mínimo de Ollama (HTTP local). Un método principal: chat(model, messages, schema) -> str.

- format = esquema JSON (salida estructurada de Ollama); si el servidor no lo acepta, se reintenta con "json".
- Qwen3: think=false si la versión de Ollama lo soporta (>= 0.9); si no, se añade "/no_think" al prompt.
- temperature 0, num_ctx 4096, stream false, keep_alive corto (OLLAMA_KEEP_ALIVE, por defecto 5m).
Cualquier fallo de red, timeout o modelo inexistente → LlmUnavailable (la API responde 503).
"""
from __future__ import annotations

import re
from typing import List, Optional

import httpx

from .config import Settings

THINK_MIN_VERSION = (0, 9, 0)


class LlmUnavailable(RuntimeError):
    pass


def _ver(s: Optional[str]):
    if not s:
        return None
    m = re.match(r"(\d+)\.(\d+)\.(\d+)", s)
    return tuple(int(x) for x in m.groups()) if m else None


class OllamaClient:
    def __init__(self, settings: Settings):
        self.s = settings
        self._version: Optional[str] = None

    # ------------------------------------------------------------------ estado
    def installed_models(self) -> Optional[List[str]]:
        """Etiquetas instaladas, o None si Ollama no responde (timeout corto)."""
        try:
            r = httpx.get(f"{self.s.ollama_url}/api/tags", timeout=self.s.status_timeout_s)
            r.raise_for_status()
            return [m.get("name") or m.get("model") for m in r.json().get("models", [])]
        except (httpx.HTTPError, ValueError):
            return None

    def version(self) -> Optional[str]:
        if self._version is None:
            try:
                r = httpx.get(f"{self.s.ollama_url}/api/version", timeout=self.s.status_timeout_s)
                self._version = r.json().get("version") or ""
            except (httpx.HTTPError, ValueError):
                return None
        return self._version or None

    def running(self) -> list:
        """/api/ps: modelos cargados con su tamaño en memoria (para el benchmark)."""
        try:
            r = httpx.get(f"{self.s.ollama_url}/api/ps", timeout=self.s.status_timeout_s)
            return r.json().get("models", [])
        except (httpx.HTTPError, ValueError):
            return []

    # ------------------------------------------------------------------ chat
    def chat(self, model: str, messages: List[dict], schema: Optional[dict] = None) -> str:
        msgs = [dict(m) for m in messages]
        body = {"model": model, "messages": msgs, "stream": False, "keep_alive": self.s.keep_alive,
                "options": {"temperature": 0, "num_ctx": 4096}}
        if schema is not None:
            body["format"] = schema
        if model.startswith("qwen3"):
            v = _ver(self.version())
            if v is not None and v >= THINK_MIN_VERSION:
                body["think"] = False
            elif msgs and msgs[0]["role"] == "system":
                msgs[0]["content"] += "\n/no_think"
        try:
            r = httpx.post(f"{self.s.ollama_url}/api/chat", json=body, timeout=self.s.ollama_timeout_s)
            if r.status_code == 400 and schema is not None:  # servidor viejo: sin esquema, solo "json"
                body["format"] = "json"
                body.pop("think", None)
                r = httpx.post(f"{self.s.ollama_url}/api/chat", json=body, timeout=self.s.ollama_timeout_s)
            if r.status_code == 404:
                raise LlmUnavailable(f"model '{model}' is not installed (ollama pull {model})")
            r.raise_for_status()
            content = (r.json().get("message") or {}).get("content", "")
        except httpx.TimeoutException as e:
            raise LlmUnavailable(f"timeout after {self.s.ollama_timeout_s:.0f}s") from e
        except httpx.HTTPError as e:
            raise LlmUnavailable(f"{type(e).__name__}: {e}") from e
        # Por si el modelo emite el bloque de pensamiento igual.
        return re.sub(r"<think>.*?</think>", "", content, flags=re.S).strip()
