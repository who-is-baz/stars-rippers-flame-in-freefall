"""Minimal Ollama client (local HTTP). One main method: chat(model, messages, schema) -> str.

- format = JSON schema (Ollama structured output); if the server does not accept it, it retries with "json".
- Qwen3: think=false if the Ollama version supports it (>= 0.9); otherwise "/no_think" is added to the prompt.
- temperature 0, num_ctx 4096, stream false, short keep_alive (OLLAMA_KEEP_ALIVE, default 5m).
Any network failure, timeout or missing model → LlmUnavailable (the API answers 503).
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
        """/api/ps: loaded models with their memory size (for the benchmark)."""
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
            if r.status_code == 400 and schema is not None:  # old server: no schema, only "json"
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
        # In case the model emits the thinking block anyway.
        return re.sub(r"<think>.*?</think>", "", content, flags=re.S).strip()
