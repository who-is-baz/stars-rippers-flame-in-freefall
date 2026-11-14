# GitHub en 10 minutos (para el hackatón)

> Para quien no lo ha usado en equipo. Reglas del repo: `README.md` y `docs/SETUP.md`.

## Idea central
`main` siempre debe funcionar. Cada quien trabaja en **su propia rama**, la sube y abre un **Pull Request (PR)**. Otra persona lo revisa y se une. Así nadie rompe el trabajo de los demás.

## Flujo de cada tarea
```bash
git checkout main
git pull origin main
git checkout -b feat/<tu-nombre>-<tema>      # ej. feat/fer-material-mapping
# ...trabaja...
git add <archivos>                            # evita "git add ." a ciegas
git commit -m "Describe el cambio (#N)" -m "AI-assisted: yes"   # si usaste IA
git push -u origin feat/<tu-nombre>-<tema>
```
En GitHub: **Compare & pull request**, escribe `Closes #N` (cierra el issue al unirse), pide revisión a otra persona.

## Mantenerte al día (hazlo seguido)
```bash
git fetch origin
git pull --rebase origin main
```
**Nunca** `git push --force` a ramas compartidas ni a `main`.

## Si hay un conflicto
1. Git marca el archivo con `<<<<<<<`, `=======`, `>>>>>>>`.
2. Abre el archivo, deja la versión correcta (o combina las dos) y borra las marcas.
3. `git add <archivo>` y `git rebase --continue`.
4. Si te trabas, **no improvises**: pide ayuda a Baz antes de forzar nada.

Para evitarlos: un issue por persona, archivos distintos, PR pequeños y frecuentes.

## Qué NO subir
- Contraseñas, tokens, llaves (ni en un commit anterior; un secreto subido hay que revocarlo).
- `data/raw/` (se regenera con `scripts/fetch_psi.py`), `psi.sqlite`, `.venv/`.
- Imágenes con logos NASA ni fotos de menores de 18 años.

## Reglas del equipo
1. Una rama por issue y un PR por tarea.
2. Sin push directo a `main`.
3. Si usaste IA: **anótalo en `docs/AI_USAGE_LOG.md`** y pon `AI-assisted: yes` en el commit. Es requisito de la entrega.
4. Revisa el PR de otra persona en menos de 30 minutos si puedes: un PR sin revisar bloquea.
5. Antes de cerrar la sesión: `docs/HANDOFF.md` (skill `shift-handoff`).

## Comandos de rescate
| Situación | Comando |
|---|---|
| ¿En qué rama estoy y qué cambié? | `git status` |
| Ver historial corto | `git log --oneline -10` |
| Descartar cambios de **un** archivo (sin commit) | `git restore <archivo>` |
| Guardar cambios a medias para cambiar de rama | `git stash` / `git stash pop` |
| Me equivoqué en el último commit (aún sin push) | `git commit --amend` |
