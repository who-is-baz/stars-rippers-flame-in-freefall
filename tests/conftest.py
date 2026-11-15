import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.join(ROOT, "src"))


def pytest_configure(config):
    config.addinivalue_line("markers", "ollama: requiere Ollama corriendo en OLLAMA_URL con los modelos descargados")
