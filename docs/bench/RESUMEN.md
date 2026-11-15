# Benchmark de modelos locales (generado por `scripts/bench_models.py`)

Fecha: 2026-11-15 08:21. Batería de 12 preguntas (8 normales, 2 trampa, 1 CO₂+O₂, 1 de dos pasos en `high`), definida en `BATTERY` porque el archivo de 12 preguntas de Fer no existe aún.

| Modelo | Herramienta ok | Args ok | no_data ok | Texto verificado (ollama) | Fallback | Errores | Mediana ms | Máx ms | Pico memoria |
|---|---|---|---|---|---|---|---|---|---|
| `llama3.2:3b` | 11/12 | 11/12 | 12/12 | 4 | 6 | 0 | 3353 | 32638 | 2.8 GB |
| `qwen3:8b` | 12/12 | 12/12 | 12/12 | 8 | 2 | 0 | 14222 | 33066 | 6.0 GB |

## Recomendación (honesta, con estos datos: laptop de 24 GB, GPU de 4 GB, 12 preguntas, un modelo cargado a la vez)

| Nivel | Modelo | Veredicto | Por qué |
|---|---|---|---|
| **Flash** | `llama3.2:3b` | **Úsalo para el demo rápido** | Responde en ~3 s en caliente (4.7 s en frío), cabe entero en la GPU (2.75 GB). Elige bien la herramienta en 11/12, pero su texto solo pasó la verificación en 4/12: el resto se muestra con la plantilla (`fallback`), que es correcta pero no "conversacional". |
| **Medium** | `qwen3:8b` | **Mejor calidad medida** | 12/12 en herramienta y argumentos; texto verificado en 8/12. Pero tarda **10–33 s** por pregunta (la GPU de 4 GB solo carga 3.4 de sus 6.0 GB) y 31 s la primera vez: requiere `VITE_LLM_TIMEOUT_MS=90000` y calentamiento. |
| **Heavy** | `qwen3:14b` | **No evaluado** | No se descargó (17 GB libres, necesitaba ~9 GB y dejaría la laptop sin espacio); con esta GPU sería más lento que el 8B. Sin evidencia, no se recomienda ni se descarta: el nivel Heavy aparece deshabilitado hasta que se instale. |

Reglas de decisión usadas: se prefiere el que acierta más (herramienta + argumentos + no_data) y luego el más rápido; ningún modelo se descartó por errores (0 errores). La mediana de tiempo en la ruta del modelo fue 3.4 s (Flash) y 15 s (Medium).
**Lo que NO se puede afirmar:** que el texto del modelo sea siempre correcto (ver `DIAGNOSTICO.md`, sección f); que Heavy funcione; ni medir con estos 12 casos algo más que tendencias (n = 12 por modelo).

Columnas de `results.csv`: `verifier_flag` = motivo por el que el verificador rechazó el texto del modelo; `mode` = ollama | fallback | low | error (`low` = respondió una regla fija, sin modelo).
