---
name: shift-handoff
description: Use when a team member is stopping (sleep, end of session, usage limit reached) to write docs/HANDOFF.md so the next session can resume quickly.
---

# Shift handoff

Antes de parar, escribe/actualiza `docs/HANDOFF.md` (fecha y hora, persona, rama):

1. **Qué quedó hecho** (con commits o PRs).
2. **Qué está en curso** y en qué archivo.
3. **Qué está roto o pendiente** (errores exactos, comandos para reproducir).
4. **Siguiente paso exacto** (un comando o archivo concreto).
5. **Decisiones tomadas** (y si ya están en `docs/DECISIONES.md`).

Haz commit del trabajo en una rama antes de parar. Una sesión nueva debe leer `docs/HANDOFF.md` y `CLAUDE.md` primero.
