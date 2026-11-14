"""Cliente mínimo para la API pública de NASA PSI (geode-py), con límite de 1 petición/seg."""
import time, requests

BASE = "https://psi.nasa.gov"
UA = "hackathon-psi-fetch/0.1 (research use)"
_last = [0.0]
session = requests.Session()
session.headers["User-Agent"] = UA

class Blocked(Exception):
    pass

def get(path_or_url, **kw):
    wait = 1.1 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    url = path_or_url if path_or_url.startswith("http") else BASE + path_or_url
    r = session.get(url, timeout=60, **kw)
    _last[0] = time.time()
    body_start = r.content[:4000].lower() if not kw.get("stream") else b""
    if r.status_code in (401, 403) or b"captcha" in body_start or "login" in r.url.lower():
        raise Blocked(f"{r.status_code} {r.url}")
    return r
