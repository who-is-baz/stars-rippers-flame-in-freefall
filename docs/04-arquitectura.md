# 04 · Arquitectura (propuesta — decisión abierta)

Libre albedrío tecnológico: esta es una propuesta alineada con lo que el equipo conoce.

## Opción A (recomendada): Python + React
```
data/cards/*.json ──► Loader ──► SQLite/DuckDB
                                   │
React + TS (Vite) ◄── REST ◄── FastAPI ──► Ranking (puro Python, con tests)
                                   └────► Asistente RAG ──► API de un LLM
```
- **Pros:** Python es el foco del equipo; FastAPI da OpenAPI y docs automáticas; React permite dashboard rico; ranking en Python fácil de testear.
- **Contras:** dos stacks; coordinar CORS/contratos.

## Opción B: Streamlit/Dash todo en Python
- **Pros:** muy rápido de montar, un solo lenguaje. **Contras:** menos control visual y de UX; el "Presentation" pesa en el juicio.

## Opción C: NestJS + React
- **Pros:** conocido por parte del equipo. **Contras:** pierde ventaja de Python para datos/IA.

## Recomendación
Opción A. Si a las 19:00 del sábado vamos atrasados, el frontend puede degradar a páginas estáticas leyendo JSON generado por el backend.

## Decisiones técnicas
- Retrieval: empezar con búsqueda por filtros + embeddings simples o TF-IDF; no sobreingeniería.
- LLM: elegir proveedor/clave **en sitio** (la clave va en `.env`, nunca en el repo).
- Despliegue: demo local + (opcional) hosting gratuito con enlace público.
- Calidad: pytest para esquema y ranking; ruff; tipado con Pydantic.

## Estructura de carpetas sugerida (se crea en el hackatón)
```
backend/  frontend/  data/cards/  notebooks/  docs/
```
