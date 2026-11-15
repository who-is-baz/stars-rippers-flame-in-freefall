"""Configuración por variables de entorno (sin secretos). Valores por defecto pensados para la laptop del demo."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

DEFAULT_ORIGINS = ("http://127.0.0.1:5173", "http://localhost:5173")


def _origins() -> Tuple[str, ...]:
    extra = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip() and o.strip() != "*"]
    return tuple(dict.fromkeys([*DEFAULT_ORIGINS, *extra]))


@dataclass(frozen=True)
class Settings:
    ollama_url: str = field(default_factory=lambda: os.environ.get("OLLAMA_URL", "http://localhost:11434").rstrip("/"))
    ollama_timeout_s: float = field(default_factory=lambda: float(os.environ.get("OLLAMA_TIMEOUT_S", "60")))
    status_timeout_s: float = 1.5
    keep_alive: str = field(default_factory=lambda: os.environ.get("OLLAMA_KEEP_ALIVE", "5m"))
    tiers: Dict[str, str] = field(default_factory=lambda: {
        "flash": os.environ.get("FLASH_MODEL", "llama3.2:3b"),
        "medium": os.environ.get("MEDIUM_MODEL", "qwen3:8b"),
        "heavy": os.environ.get("HEAVY_MODEL", "qwen3:14b"),
    })
    cors_origins: Tuple[str, ...] = field(default_factory=_origins)
    db_path: str = field(default_factory=lambda: os.environ.get("PSI_DB", ""))

    def allowed_models(self) -> List[str]:
        return list(dict.fromkeys(self.tiers.values()))

    def default_model(self, level: str) -> str:
        """Modelo si el cliente no manda `model`: medium → MEDIUM_MODEL, high → HEAVY_MODEL."""
        return self.tiers["heavy"] if level == "high" else self.tiers["medium"]


def get_settings() -> Settings:
    return Settings()
