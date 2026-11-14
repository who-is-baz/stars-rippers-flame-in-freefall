---
name: api-contract
description: Use when building or consuming the Flame in Freefall API or its mock. Keeps backend and frontend aligned with docs/07-api-contract.md.
---

# API contract

Fuente de verdad: `docs/07-api-contract.md`. Contrato primero, código después.

## Reglas
1. No cambies un endpoint, parámetro o campo sin actualizar `docs/07-api-contract.md` en el mismo PR y avisar a quien lo consume.
2. Toda respuesta incluye `sources` (DOIs) y `limitations`.
3. Nunca imputes nulos. Todo porcentaje lleva `pct_note`; si `n < 5`, también `warning`.
4. Todo acceso a datos pasa por `src/psi_queries.py` (sqlite de solo lectura). No escribas SQL en otro sitio.
5. UI y respuestas en inglés.
6. El frontend se desarrolla contra el mock hasta que el backend publique `/docs` (OpenAPI).
7. Añade o actualiza un test cuando cambies un endpoint.
