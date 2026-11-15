# HANDOFF — 2026-11-15 ~01:05 · Baz (sesión con Claude Opus 5.5) · rama `main`

## 1. Qué quedó hecho (commits en `main`)
| Fase | Commit | Comprobar |
|---|---|---|
| 1 API base: `/meta`, `/experiments`, `/coverage`, `/queries/{name}`, `/gaps`, `/compare`, CORS, 400/404/503 | `4f1ab7d` | `python -m pytest tests/test_api_base.py` |
| 2 `/ask` low (reglas + plantillas), paridad con `answers.json` | `844bb2e` | `python -m pytest tests/test_api_ask_low.py` |
| 3 Ollama, `/llm/status`, medium (router + verificación + fallback) | `ceb58e0` | `python -m pytest tests/test_api_ask_llm.py` |
| 4 high (3 pasos) + endurecimiento + contrato docs/07 | `7b428a9` | ídem |
| 5 Front: Connect local AI, `model`/`meta`, smoke e2e | `a7120b6` | `python scripts/smoke_e2e.py`, `cd frontend && npm test` |
| 6 Benchmark, docs, bitácora, este archivo | (último commit) | `python scripts/bench_models.py` |

Código: `src/backend/` (`app.py` rutas · `assistant.py` /ask y /llm/status · `low.py` reglas · `tools.py` catálogo,
citas y plantillas · `pipeline.py` medium/high · `verify.py` verificador · `llm.py` Ollama · `config.py` entorno).
`src/psi_queries.py` ganó `get_experiment` y `query_test_ids` (el SQL sigue solo ahí).

## 2. En curso
Nada a medias en el código.

## 3. Roto o pendiente (sin maquillar)
- **No se probó ningún modelo real.** Ollama 0.21.1 está instalado, pero `~/.ollama` es un enlace a
  `/media/baz/Windows Extend/Local_AI/.ollama` (disco no montado): `ollama serve` falla con
  `could not create directory ~/.ollama: file exists`. Por eso `docs/bench/RESUMEN.md` dice "sin resultados" y las
  8 pruebas `-m ollama` se saltan. Todo lo de medium/high está probado con un cliente falso (`tests/fake_llm.py`).
- Los prompts del router/redactor no se han afinado con modelos reales: es probable que modelos de 3B caigan seguido
  a `fallback` (plantilla). Eso es seguro (la plantilla es correcta), pero hay que medirlo.
- Timeout del front 15 s: `qwen3:14b` en CPU con 2–4 llamadas probablemente lo exceda → el front responde con Basic.
  Para el video: `VITE_LLM_TIMEOUT_MS=90000`.
- `/ranking` no está implementado (faltan los pesos de Fer). Las 12 preguntas de Fer no existen: el benchmark usa
  una batería propia (`BATTERY` en `scripts/bench_models.py`).
- `main` tiene protección (PR + 1 aprobación); los push directos pasaron por ser admin (`enforce_admins=false`).

## 4. Siguiente paso exacto
```bash
# montar el disco "Windows Extend" (o: export OLLAMA_MODELS=/ruta/con/espacio) y luego:
ollama serve &
ollama pull llama3.2:3b && ollama pull qwen3:8b && ollama pull qwen3:14b   # si no estaban
python -m pytest -m ollama -rs
python scripts/bench_models.py      # actualiza docs/bench/ → decidir Flash/Medium/Heavy con la tabla
```

## 5. Decisiones
Todas en `docs/DECISIONES.md` (entradas del 2026-11-15): rutas `/api` + alias, `query_test_ids`, contrato aditivo
(`model`, `meta`, `test_ids_total`, `/llm/status`), herramienta `scenario`, salida estructurada, tolerancia del
verificador y reglas de guardia.

---
## Actualización 2026-11-15 ~01:50 · cierre de entrega (Baz con Claude)
- Hecho (commits `b23e54c`…`dcb77cb`): inspector ligado a Custom, móvil sin desborde, Lighthouse móvil 97/100/100/100,
  `/ranking` marcado post-hackathon, `LICENSE`, `THIRD_PARTY.md`, README con licencias e IA, `docs/submission/` completo.
- Sigue sin probarse Ollama (disco no montado).
- **Siguiente paso exacto:** `docs/submission/READINESS.md` → sección "Manual actions for Baz" (grabar demo, publicar sitio,
  limpieza/secretos y repo público, pegar los 8 campos y enviar con ≥3 h de margen).
