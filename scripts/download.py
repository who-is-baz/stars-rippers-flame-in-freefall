"""Descarga archivos de NASA PSI a data/raw/<experimento>/ y los registra en data/raw/MANIFEST.csv.

Uso: python3 scripts/download.py <ACCESSION> <EXPERIMENTO> "<s3_key>|<file_version>" [...]

- Respeta >=1.1 s entre peticiones (psi_client).
- Nunca sobrescribe un archivo crudo existente: si ya está, lo omite.
- Se detiene si la API responde 401/403 o aparece login/captcha.
"""
import csv, hashlib, os, sys, datetime
from urllib.parse import urlparse
sys.path.insert(0, "scripts")
from psi_client import get, Blocked

MANIFEST = "data/raw/MANIFEST.csv"
FIELDS = ["experiment", "accession", "file_name", "s3_key", "source_url", "download_utc", "size_bytes", "sha256"]


def presigned(accession, name, version):
    # Igual que el front-end: file = nombre del archivo, version = versión del archivo
    r = get(f"/geode-py/ws/studies/{accession}/download",
            params={"file": name, "version": version, "redirect": "false"})
    r.raise_for_status()
    url = r.text.strip().strip('"')
    if not url.startswith("http"):
        raise RuntimeError(f"respuesta inesperada para {name}: {r.text[:200]}")
    return url


def main(accession, experiment, items):
    outdir = os.path.join("data/raw", experiment)
    os.makedirs(outdir, exist_ok=True)
    new_manifest = not os.path.exists(MANIFEST)
    with open(MANIFEST, "a", newline="") as mf:
        w = csv.DictWriter(mf, FIELDS)
        if new_manifest:
            w.writeheader()
        for item in items:
            key, version = item.rsplit("|", 1)
            name = key.rsplit("/", 1)[1]
            dest = os.path.join(outdir, name)
            if os.path.exists(dest):
                print("ya existe, omitido:", dest)
                continue
            url = presigned(accession, name, version)
            r = get(url, stream=True)
            r.raise_for_status()
            h, size, tmp = hashlib.sha256(), 0, dest + ".part"
            with open(tmp, "wb") as fh:
                for chunk in r.iter_content(1 << 16):
                    fh.write(chunk); h.update(chunk); size += len(chunk)
            os.replace(tmp, dest)
            os.chmod(dest, 0o444)  # solo lectura: los crudos no se modifican
            p = urlparse(url)
            w.writerow({"experiment": experiment, "accession": accession, "file_name": name, "s3_key": key,
                        # se guarda la URL sin la firma temporal (expira y contiene credenciales)
                        "source_url": f"{p.scheme}://{p.netloc}{p.path}",
                        "download_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                        "size_bytes": size, "sha256": h.hexdigest()})
            mf.flush()
            print(f"OK {size:>10} B  {dest}")


if __name__ == "__main__":
    try:
        main(sys.argv[1], sys.argv[2], sys.argv[3:])
    except Blocked as e:
        sys.exit(f"DETENIDO: el sitio pidió login/captcha o negó acceso ({e}).")
