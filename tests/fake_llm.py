"""Fake LLM client for the tests: returns scripted answers and records the calls."""
import json

from backend.llm import LlmUnavailable


class FakeLLM:
    def __init__(self, replies=(), installed=("llama3.2:3b", "qwen3:8b")):
        self.replies = list(replies)
        self.calls = []
        self._installed = None if installed is None else list(installed)

    def installed_models(self):
        return self._installed

    def version(self):
        return "0.21.1"

    def running(self):
        return []

    def chat(self, model, messages, schema=None):
        self.calls.append({"model": model, "messages": messages, "schema": schema})
        if not self.replies:
            raise AssertionError("unexpected extra model call")
        r = self.replies.pop(0)
        if isinstance(r, Exception):
            raise r
        return r if isinstance(r, str) else json.dumps(r)


def route(tool, **args):
    return {"tool": tool, "args": args}


def text(answer):
    return {"answer": answer}


DOWN = LlmUnavailable("ConnectError: connection refused")
