"""Runs each query of docs/sql_examples.sql on data/processed/psi.sqlite (read only)."""
import re, sqlite3
con = sqlite3.connect("file:data/processed/psi.sqlite?mode=ro", uri=True)
sql = open("docs/sql_examples.sql").read()
for block in re.split(r"\n(?=-- Q\d)", sql):
    m = re.match(r"-- (Q\d.*)\n", block)
    if not m:
        continue
    cur = con.execute(block)
    cols = [d[0] for d in cur.description]; rows = cur.fetchall()
    print(f"\n### {m.group(1)}")
    w = [max(len(str(c)), *(len(str(r[i])) for r in rows)) if rows else len(c) for i, c in enumerate(cols)]
    print(" | ".join(str(c).ljust(w[i]) for i, c in enumerate(cols)))
    for r in rows:
        print(" | ".join(str(v).ljust(w[i]) for i, v in enumerate(r)))
