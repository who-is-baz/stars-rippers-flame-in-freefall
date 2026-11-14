# Tareas · Jovanny (Infra, despliegue y QA)

## Ahora (hasta 12:00)
1. Que **todos puedan correr el proyecto**: escribe en `README` los pasos exactos (Python 3.12, Node 20+, `.venv`, `fetch_psi.py`, generar `psi.sqlite`). Pruébalos en otra laptop.
2. **Benchmark de Ollama** en cada laptop: `nvidia-smi` (VRAM), `ollama list`, tokens por segundo con `qwen2.5:3b` y `llama3:8b` (los modelos están en el disco externo de Baz). Reporta una tabla: máquina, RAM, VRAM, modelo, tokens/s. Con eso se decide cuál es la "máquina del demo".
3. Revisa cómo es el **wifi de la sede** (velocidad, si bloquea algo). Descarga todo lo necesario ahora, no más tarde.

## Hasta las 16:00
4. **Enlace público (obligatorio para la entrega):** el proyecto final debe ser accesible sin contraseña ni registro. Define cómo:
   - Frontend estático (GitHub Pages / Vercel / Netlify) + API (servicio gratuito) **o** un build estático con los datos precargados.
   - El enlace público **no tendrá Ollama**: el modo `low` de `/ask` debe funcionar sin LLM; los modos medium/high se muestran en el video.
   - Prueba el enlace en ventana de incógnito y desde el celular.
5. QA: lista de 10 preguntas de prueba para `/ask` (con 3 trampas sin respaldo) y verifica citas.

## Domingo
6. Grabación del demo (video ≤30 s con subtítulos en inglés, o ≤7 diapositivas; enlace público).
7. Lista de verificación final de `docs/05-entrega-draft-en.md`.

## Listo cuando
Cualquiera del equipo levanta el proyecto en 10 min, la tabla del benchmark existe y el enlace público abre en incógnito.
