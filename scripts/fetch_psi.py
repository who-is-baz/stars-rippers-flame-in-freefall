#!/usr/bin/env python3
"""Descarga reproducible de las tablas NASA PSI usadas en el proyecto (BASS-II y FLEX).

Requiere solo `requests`. Hace como máximo 1 petición por segundo a psi.nasa.gov / S3.

Uso:
    python3 scripts/fetch_psi.py                  # descarga lo que falte en data/raw/ y verifica todo
    python3 scripts/fetch_psi.py --verify-only    # solo verifica SHA-256 de lo que ya existe
    python3 scripts/fetch_psi.py --out /tmp/x     # descarga en otra carpeta

Cada archivo se compara contra el tamaño y el SHA-256 fijados abajo (FILES). Si no coincide,
el script termina con error y el archivo descargado queda como <nombre>.mismatch, sin reemplazar nada.
Los archivos existentes nunca se sobrescriben. Si en la carpeta de salida no hay MANIFEST.csv,
se crea uno con: URL de origen, fecha de descarga (UTC), tamaño y SHA-256.

API (descubierta en el front-end de https://psi.nasa.gov/physci/repo):
    GET /geode-py/ws/studies/<PSI-ID>/download?file=<nombre>&version=<versión>&redirect=false
        -> devuelve en texto una URL de S3 pre-firmada y temporal
"""
import argparse, csv, datetime, hashlib, os, sys, time
from urllib.parse import urlparse

import requests

BASE = "https://psi.nasa.gov"
USER_AGENT = "nasa-psi-hackathon-fetch/1.0 (research use)"
MIN_INTERVAL_S = 1.1  # >= 1 s entre peticiones

# (experimento, accession, s3_key, versión del archivo, tamaño en bytes, sha256)
FILES = [
    ("BASS-II", "PSI-25", "psi-data/PSI-25/Experimental table/PSI-25_Experimental table_BASS-II.csv", 1,
     16590, "71e792bf6b5fb5ea620c5dd70fbbac05515992e12aefcf5dff47312caa48c042"),
    ("BASS-II", "PSI-25", "psi-data/PSI-25/Reference Data/PSI-25_Reference Data_Fan calibration data.xlsx", 2,
     23973, "bc0dca3efdef44a7774d8dd37aebc0cedae8d67d7bae8c9cbde9590014a3c983"),
    ("BASS-II", "PSI-25", "psi-data/PSI-25/Science Documents/PSI-25_Science Documents_BASS-II_Test.Matrices.xlsx", 2,
     28956, "1a3b283dd0adec861793bbc4a454aab64d398cd32d6f37d7a1ad0f642879e686"),
    ("FLEX", "PSI-69", "psi-data/PSI-69/Experimental table/PSI-69_Experimental table_FLEX.csv", 1,
     24776, "37c88ce8ae9391b7544ff630a45ce87543d04d317cdbfbed104fe7d5c27e1b96"),
    ("FLEX", "PSI-69", "psi-data/PSI-69/Raw Data/PSI-69_Raw Data_30CAL07-Test009 Results.xls", 1,
     1399808, "0249b7a241b062a60479416ab70c15c84d36324cdb83acda17c06c3ec1efe15c"),
    ("FLEX", "PSI-69", "psi-data/PSI-69/Raw Data/PSI-69_Raw Data_Test 002 Results.xls", 1,
     499712, "43026a05df7fc720318fe0b39273a31b051ecca373b1d39c655286afd4f47c87"),
    ("FLEX", "PSI-69", "psi-data/PSI-69/Calibration/PSI-69_Calibration_20CAL10_Chamber_Readings.txt", 1,
     311283, "b42cffdcc247a989a203de7be12d87653da0af2956f22d987aab6ed43a43883e"),
    ("FLEX", "PSI-69", "psi-data/PSI-69/Calibration/PSI-69_Calibration_20CAL10_Radiometer_Readings.txt", 1,
     268887, "ec9e6eeb71c41e0e226d288f257801fba7dd92559718ef449fe57f90d3ddab8a"),
]
MANIFEST_FIELDS = ["experiment", "accession", "file_name", "s3_key", "source_url", "download_utc", "size_bytes", "sha256"]


class RateLimitedSession:
    def __init__(self):
        self.s = requests.Session()
        self.s.headers["User-Agent"] = USER_AGENT
        self._last = 0.0

    def get(self, url, **kw):
        wait = MIN_INTERVAL_S - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        try:
            r = self.s.get(url, timeout=120, **kw)
        finally:
            self._last = time.monotonic()
        if r.status_code in (401, 403) or "login" in r.url.lower():
            sys.exit(f"DETENIDO: acceso denegado o redirección a login ({r.status_code} {r.url}). Revisar a mano.")
        r.raise_for_status()
        return r


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def download(http, accession, key, version, dest):
    name = key.rsplit("/", 1)[1]
    r = http.get(f"{BASE}/geode-py/ws/studies/{accession}/download",
                 params={"file": name, "version": version, "redirect": "false"})
    url = r.text.strip().strip('"')
    if not url.startswith("https://"):
        sys.exit(f"Respuesta inesperada al pedir la URL de {name}: {r.text[:200]!r}")
    r = http.get(url, stream=True)
    tmp = dest + ".part"
    with open(tmp, "wb") as f:
        for chunk in r.iter_content(1 << 16):
            f.write(chunk)
    p = urlparse(url)
    return tmp, f"{p.scheme}://{p.netloc}{p.path}"  # sin la firma temporal


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="data/raw", help="carpeta de salida (default: data/raw)")
    ap.add_argument("--verify-only", action="store_true", help="no descargar; solo verificar lo existente")
    args = ap.parse_args()

    http = RateLimitedSession()
    manifest_path = os.path.join(args.out, "MANIFEST.csv")
    new_rows, errors = [], 0

    for exp, acc, key, version, size, sha in FILES:
        name = key.rsplit("/", 1)[1]
        dest = os.path.join(args.out, exp, name)
        if os.path.exists(dest):
            ok = os.path.getsize(dest) == size and sha256_of(dest) == sha
            print(f"{'OK      ' if ok else 'FALLA   '} (existente) {dest}")
            errors += not ok
            continue
        if args.verify_only:
            print(f"FALTA    {dest}")
            errors += 1
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        tmp, src = download(http, acc, key, version, dest)
        got_sha, got_size = sha256_of(tmp), os.path.getsize(tmp)
        if got_sha != sha or got_size != size:
            os.replace(tmp, dest + ".mismatch")
            print(f"FALLA    {dest}: sha256/tamaño no coinciden (esperado {size} B {sha[:12]}…, "
                  f"recibido {got_size} B {got_sha[:12]}…). Guardado como .mismatch")
            errors += 1
            continue
        os.replace(tmp, dest)
        os.chmod(dest, 0o444)  # los crudos son de solo lectura
        print(f"OK       (descargado) {dest}")
        new_rows.append({"experiment": exp, "accession": acc, "file_name": name, "s3_key": key, "source_url": src,
                         "download_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                         "size_bytes": got_size, "sha256": got_sha})

    if new_rows and not os.path.exists(manifest_path):
        with open(manifest_path, "w", newline="") as f:
            w = csv.DictWriter(f, MANIFEST_FIELDS)
            w.writeheader()
            w.writerows(new_rows)
        print("MANIFEST creado:", manifest_path)
    elif new_rows:
        print(f"Aviso: {manifest_path} ya existe; no se modificó. Archivos nuevos: {[r['file_name'] for r in new_rows]}")

    print(f"\n{len(FILES) - errors}/{len(FILES)} archivos verificados.")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
