# Diagnóstico de los modelos locales (Ollama) — 2026-11-15

Objetivo: saber por qué Flash / Medium / Heavy nunca habían funcionado y dejarlos funcionando en la laptop (22 GB de RAM libres de 24, GPU con 4 GB de VRAM).
Generado a mano a partir de los comandos de abajo; las mediciones de la sección d las produce `scripts/diagnose_ollama.py` (JSON en `docs/bench/diagnostico.json`).

## a. ¿Ollama instalado y respondiendo?
- `ollama --version` → cliente **0.21.1** instalado (`/usr/local/bin/ollama`).
- `systemctl is-active ollama` → **inactive**; `curl http://localhost:11434/api/tags` → sin respuesta. El servicio no corría.

## b. Causa raíz: el directorio de modelos apunta a un disco que no está montado
- `~/.ollama` es un **enlace roto** a `/media/baz/Windows Extend/Local_AI/.ollama` (el disco "Windows Extend" no está montado).
- Además, la variable de entorno **`OLLAMA_MODELS=/media/baz/Windows Extend/Local_AI/.ollama`** está exportada en el entorno del usuario: aunque el servicio arrancara,
  buscaría los modelos en ese disco. Con el enlace roto, `ollama serve` falla con `could not create directory ~/.ollama: file exists`.
- Espacio libre en el disco local: **17 GB** (`df -h /`, 77 % usado) → **menos de 20 GB**, así que solo se descargan **llama3.2:3b (~2 GB)** y **qwen3:8b (~5 GB)**;
  **qwen3:14b (~9 GB) queda "no descargado por falta de espacio"** (dejaría la laptop con ~1 GB libres).
- Lo que se hizo (sin tocar el enlace ni el disco del usuario): `mkdir ~/ollama-home ~/ollama-models` y arrancar el servicio con variables solo para ese proceso:
  `HOME=$HOME/ollama-home OLLAMA_MODELS=$HOME/ollama-models OLLAMA_HOST=127.0.0.1:11434 OLLAMA_MAX_LOADED_MODELS=1 OLLAMA_NUM_PARALLEL=1 OLLAMA_KEEP_ALIVE=5m ollama serve`
  (el `HOME` distinto evita el enlace roto `~/.ollama`). Respondió en 1 s: `{"version":"0.21.1"}`.

## c. Descarga
- Red hacia `registry.ollama.ai`: alcanzable. Velocidad medida: ~5–10 MB/s.
- Con 17 GB libres se descargaron **llama3.2:3b** (2.0 GB) y **qwen3:8b** (5.2 GB) con `ollama pull` (≈ 25 min en total). **qwen3:14b no se descargó** (espacio).

## d. Medición directa (`scripts/diagnose_ollama.py`, `/api/chat` con el prompt real del router; resultados en `diagnostico.json`)
| Modelo | 1ª respuesta (carga en frío) | 2ª (en caliente) | Memoria cargado | JSON del router | `think` |
|---|---|---|---|---|---|
| llama3.2:3b | 4.7 s | 0.8 s | 2.75 GB (todo en la GPU de 4 GB) | válido, herramienta correcta | n/a |
| qwen3:8b | 30.8 s | 2.2 s | 6.0 GB (3.4 GB en GPU, el resto en RAM del sistema) | válido, herramienta correcta | sin campo `thinking` |
| qwen3:14b | no descargado | | | | |
- Solo hay **un** modelo cargado a la vez (el script descarga el anterior con `keep_alive: 0`; el servicio se arrancó con `OLLAMA_MAX_LOADED_MODELS=1`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_KEEP_ALIVE=5m`). RAM del sistema libre durante las pruebas: ~16 GB.
- **Consecuencia para el demo:** la 1ª pregunta tras cargar un modelo tarda 5–31 s. El front espera 15 s por defecto y caería a Basic: usar `VITE_LLM_TIMEOUT_MS=90000` y una **pregunta de calentamiento** antes de grabar.

## e. Razonamiento de Qwen3 (`think`)
- Versión de Ollama 0.21.1 (≥ 0.9): acepta `think: false`. Sin él, Qwen3 generó ~970 caracteres de razonamiento (`message.thinking`) antes de responder y tardó el doble; con `think:false`, 0 caracteres. `OllamaClient` ya lo envía (y usa `/no_think` en el prompt si la versión es anterior).
- Salida JSON: con `format` = esquema JSON, 12/12 respuestas del router de qwen3:8b y 11/12 de llama3.2:3b fueron JSON válido con herramienta existente.

## f. Qué falló con modelos reales y qué se arregló (el modelo simulado de las pruebas no lo mostraba)
1. **Router (llama3.2:3b):** rellenaba con ceros lo que omitía (`pressure 0–0`, `O2 0–1`), ponía rangos de ancho cero (0.7–0.7 atm) y elegía `lunar_nasa` para "Moon base". Arreglo: ejemplos en el prompt del router, ceros = "sin filtro", rangos puntuales ensanchados a la ventana estándar (±0.1 atm / ±0.01 O₂). Son argumentos, no cifras de la respuesta.
2. **Redactor:** el modelo de 3B escribió **cifras reales en un contexto falso** (p. ej. "1.68 mm a presión atmosférica", que era la fila sin presión; "el burning rate aumenta con el O₂"). La comprobación "cada número está en el resultado" no lo detecta. Se **endureció** el verificador (nunca se relajó): frases completas, ≥ 6 palabras, al menos una cifra del resultado, sin tendencias ("increases/decreases"), sin generalizaciones ("generally/overall") y causalidad de un gas en cualquier orden. Un ejemplo con cifras en el prompt fue copiado por el modelo, así que se quitó.
3. **Mi bug:** "Tell me about FLEX test 20CAL08" se contestaba como "what is FLEX" (categoría *about*); ahora un ID de prueba gana siempre.
- **Límite que sigue vigente:** la verificación por pertenencia de números no garantiza que la frase diga algo cierto. Por eso todo texto del modelo lleva la etiqueta "AI-generated text" y sus citas, y la plantilla determinista es el respaldo.
