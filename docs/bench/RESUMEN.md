# Benchmark de modelos locales (generado por `scripts/bench_models.py`)

Fecha: 2026-11-15 00:58. Batería de 12 preguntas (8 normales, 2 trampa, 1 CO₂+O₂, 1 de dos pasos en `high`), definida en `BATTERY` porque el archivo de 12 preguntas de Fer no existe aún.

| Modelo | Herramienta ok | Args ok | no_data ok | Texto verificado (ollama) | Fallback | Errores | Mediana ms | Máx ms | Pico memoria |
|---|---|---|---|---|---|---|---|---|---|
| `llama3.2:3b` | — | — | — | — | — | — | — | — | saltado: Ollama not reachable at http://localhost:11434 |
| `qwen3:8b` | — | — | — | — | — | — | — | — | saltado: Ollama not reachable at http://localhost:11434 |
| `qwen3:14b` | — | — | — | — | — | — | — | — | saltado: Ollama not reachable at http://localhost:11434 |

## Recomendación

**Sin resultados**: ningún modelo se pudo correr en esta máquina (ver la tabla). No se recomienda nada sin evidencia; correr de nuevo en la laptop del demo.

Columnas de `results.csv`: `verifier_flag` = motivo por el que el verificador rechazó el texto del modelo (números inventados, frase prohibida, etc.); `mode` = ollama | fallback | low | error.
