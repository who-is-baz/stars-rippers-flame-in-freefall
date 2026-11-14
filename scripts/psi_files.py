import sys, time
sys.path.insert(0, "scripts")
import psi_client as pc

def list_files(accession, version):
    w = 1.1 - (time.time() - pc._last[0])
    if w > 0: time.sleep(w)
    r = pc.session.post(pc.BASE + "/geode-py/ws/files/v2",
                        json={"folder": "", "fileType": "study", "studyId": accession, "version": version}, timeout=120)
    pc._last[0] = time.time()
    if r.status_code in (401, 403): raise pc.Blocked(r.status_code)
    r.raise_for_status()
    return r.json()["files"]

def walk(nodes, folder=None):
    for n in nodes:
        if n.get("directory") is False:
            yield folder, n
        else:
            yield from walk(n.get("files", []), n.get("displayName") or n.get("key"))
