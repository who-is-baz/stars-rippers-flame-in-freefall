# Security and privacy report — 2026-11-15 (repo is PUBLIC)

## Secrets
Scanned the working tree **and the whole history** (111 commits, all branches, `git log --all -p`) for: `ghp_`, `github_pat_`,
`gho_`, `sk-`, `AKIA…`, `xox…`, JWTs, private keys, URLs with credentials, `password/api_key/secret/token = …`, absolute home paths.
**Result: 0 matches.** No `.env*`, `*.sqlite`, `data/raw/`, `node_modules/`, `dist/` or `site.zip` was ever committed. The built site contains no
keys (`dist/` grep). `docs/00-reglas-y-checklist.md` and `docs/tareas/baz-lider.md` mention *revoking the `keygithub` token* as a to-do:
the repo contains **no** token, but **revoke that token anyway if it was not revoked** (cannot be verified from here).
Tools: `git log -G` regex scans (gitleaks/trufflehog were not installed; not added to the repo).

## Personal data (for the team to decide; not changed)
- Commit metadata (immutable without rewriting history, which was not done): **5 real personal/university e-mail addresses** of team
  members appear as commit authors (Gmail, `@upv.edu.mx`, `@upq.edu.mx`), plus one throw-away `t@t`; the rest are GitHub no-reply addresses.
  Anyone can read them with `git log`. Options: leave as is (they are already public), or ask each person.
- Files: `docs/00-reglas-y-checklist.md` lists a university contact e-mail and a WhatsApp phone number of the local organisers
  (public contact data from the event guide). Remove them if you prefer.
- `docs/HANDOFF.md` mentions a local disk path (`/media/baz/…`): harmless, no secret.

## Backend hardening (tested in `tests/test_scope.py`, `tests/test_api_*.py`)
CORS limited to configured origins (`*` is ignored); question ≤ 500 chars (400 otherwise); per-IP rate limit on `/ask` (60/min, `ASK_RATE_PER_MIN`);
Ollama timeout; closed tool list validated by Pydantic; no free SQL, no file reads, no `subprocess`; unexpected errors return
`{"detail": "Internal error."}` with no trace; the model sees only the sanitised question and tool results. The backend is **never** deployed
publicly; the public site is static.

## Frontend
No `dangerouslySetInnerHTML`, `eval` or `innerHTML` in `frontend/src`; model text is rendered as text; external links use `rel="noopener noreferrer"`;
the production bundle has no keys and its only absolute URL is the optional local `http://127.0.0.1:8000`.

## Dependencies
`npm audit` (all and `--omit=dev`): 0 vulnerabilities. `pip-audit -r requirements.txt`: no known vulnerabilities.
