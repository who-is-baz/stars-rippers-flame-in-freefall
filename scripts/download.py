"""Downloads NASA PSI files into data/raw/<experiment>/ and records them in data/raw/MANIFEST.csv.

Uso: python3 scripts/download.py <ACCESSION> <EXPERIMENTO> "<s3_key>|<file_version>" [...]

- Respeta >=1.1 s entre peticiones (psi_client).
- Never overwrites an existing raw file: if it is there, it is skipped.
- Stops if the API answers 401/403 or a login/captcha appears.
"""
import csv, hashlib, os, sys, datetime
from urllib.parse import urlparse
sys.path.insert(0, "scripts")
from psi_client import get, Blocked

MANIFEST = "data/raw/MANIFEST.csv"
FIELDS = ["experiment", "accession", "file_name", "s3_key", "source_url", "download_utc", "size_bytes", "sha256"]


def presigned(accession, name, version):
    # Same as the PSI front end: file = file name, version = file version
    r = get(f"/geode-py/ws/studies/{accession}/download",
            params={"file": name, "version": version, "redirect": "false"})
    r.raise_for_status()
    url = r.text.strip().strip('"')
    if not url.startswith("http"):
        raise RuntimeError(f"unexpected response for {name}: {r.text[:200]}")
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
            os.chmod(dest, 0o444)  # read only: raw files are never modified
            p = urlparse(url)
            w.writerow({"experiment": experiment, "accession": accession, "file_name": name, "s3_key": key,
                        # the URL is stored without the temporary signature (it expires and contains credentials)
                        "source_url": f"{p.scheme}://{p.netloc}{p.path}",
                        "download_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                        "size_bytes": size, "sha256": h.hexdigest()})
            mf.flush()
            print(f"OK {size:>10} B  {dest}")


if __name__ == "__main__":
    try:
        main(sys.argv[1], sys.argv[2], sys.argv[3:])
    except Blocked as e:
        sys.exit(f"STOPPED: the site asked for a login/captcha or denied access ({e}).")
