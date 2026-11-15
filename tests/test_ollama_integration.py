"""Integración con Ollama REAL. Se saltan solas si Ollama no responde o el modelo no está descargado.

Correr:  python -m pytest -m ollama -v        (con `ollama serve` y `ollama pull llama3.2:3b` etc.)
No afirman calidad del modelo: verifican que el pipeline real devuelve la forma del contrato y que ningún texto
marcado como `ollama` contiene números inventados o frases prohibidas (el verificador corre de nuevo aquí).
"""
import pytest
from fastapi.testclient import TestClient

from backend import tools as T, verify
from backend.app import create_app
from backend.config import get_settings
from backend.llm import OllamaClient

pytestmark = pytest.mark.ollama
SETTINGS = get_settings()
INSTALLED = OllamaClient(SETTINGS).installed_models()


def _model_or_skip(tier):
    tag = SETTINGS.tiers[tier]
    if INSTALLED is None:
        pytest.skip(f"Ollama not reachable at {SETTINGS.ollama_url}")
    if tag not in INSTALLED and f"{tag}:latest" not in INSTALLED:
        pytest.skip(f"{tag} not downloaded (ollama pull {tag})")
    return tag


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app())


def test_status_lists_installed(client):
    if INSTALLED is None:
        pytest.skip("Ollama not reachable")
    s = client.get("/api/llm/status").json()
    assert s["available"] is True


@pytest.mark.parametrize("tier,level", [("flash", "medium"), ("medium", "medium"), ("heavy", "high")])
@pytest.mark.parametrize("question", ["Which fuel burns faster, heptane or methanol?",
                                      "Is there data for the expected Moon-base air of 30% oxygen at 10.2 psi?"])
def test_real_model_answer_is_grounded(client, tier, level, question):
    tag = _model_or_skip(tier)
    r = client.post("/api/ask", json={"question": question, "level": level, "model": tag})
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["meta"]["model"] == tag and b["meta"]["mode"] in ("ollama", "fallback", "low")
    assert all(len(c["test_ids"]) <= 20 for c in b["citations"])
    if b["meta"]["mode"] == "ollama":
        # re-ejecuta las herramientas que usó y vuelve a verificar el texto
        from backend import data
        con = data.connect()
        trs = [T.execute(con, c["tool"], c["args"]) for c in b["tool_calls"] if c.get("tool") in T.TOOLS]
        assert verify.check(b["answer"], trs) == []
    if "Moon" in question:
        assert "lunar test" not in b["answer"].lower()


def test_real_model_trap(client):
    tag = _model_or_skip("flash")
    b = client.post("/api/ask", json={"question": "Which fuel is safer on the Moon?", "level": "medium",
                                      "model": tag}).json()
    assert b["no_data"] is True
