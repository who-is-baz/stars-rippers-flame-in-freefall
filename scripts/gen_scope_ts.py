#!/usr/bin/env python3
"""Genera frontend/src/assistant/scope.generated.ts desde src/backend/scope.py (mismo alcance en Basic y en el backend).
Uso: python scripts/gen_scope_ts.py   (tests/test_scope.py comprueba que el archivo generado está al día)."""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "src"))
from backend import scope  # noqa: E402

OUT = os.path.join(ROOT, "frontend", "src", "assistant", "scope.generated.ts")


def render() -> str:
    rx = lambda name, r: f"export const {name} = new RegExp({json.dumps(r.pattern)}, 'i');\n"
    return ("// GENERADO por scripts/gen_scope_ts.py desde src/backend/scope.py. No editar a mano.\n"
            f"export const REFUSAL_TEXT = {json.dumps(scope.REFUSAL_TEXT)};\n"
            + rx("TOPIC_RE", scope.TOPIC_RE) + rx("DISALLOWED_RE", scope.DISALLOWED_RE)
            + rx("INJECTION_RE", scope.INJECTION_RE) + rx("LIVE_RE", scope.LIVE_RE) + rx("SAFETY_RE", scope.SAFETY_RE)
            + f"export const ID_RE = new RegExp({json.dumps(scope._ID_RE.pattern)});\n")


if __name__ == "__main__":
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(render())
    print("wrote", os.path.relpath(OUT, ROOT))
