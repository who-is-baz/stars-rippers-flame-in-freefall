import json, sys, datetime
sys.path.insert(0, "scripts")
from psi_client import get
r = get("/geode-py/ws/repo/search", params={"source": "psi", "type": "investigation", "from": 0, "size": 200})
d = r.json()
json.dump(d, open(sys.argv[1], "w"))
hits = d["hits"]["hits"]
print("total:", d["hits"]["total"], "devueltos:", len(hits))
from collections import Counter
print(Counter(h["_source"].get("Research Area") for h in hits))
