#!/usr/bin/env python3
"""PROPUESTA (no aplicada) de normalización de material_raw de BASS-II a categorías.

Escribe docs/material_mapping_proposal.csv para revisión humana. Nada de data/processed/ usa este mapeo todavía.
Fuente de las reglas: BASS-II ReadMe ("Bhattacharjee burned ... very thin pmma films", "Miller ... thick pmma
slabs", "Olson ... pmma rods (mostly clear)", "Fernandez-Pello ... pmma rods (mostly black)", "T'ien ... SIBAL
fabric (75/25 cotton/fiberglass) ... 4 cm pmma spherical section", "Ferkul ... Nomex III and a candle").
"""
import re
import pandas as pd

b = pd.read_csv("data/processed/bass2_tests.csv")
g = (b.groupby("material_raw")
       .agg(n_tests=("test_id", "size"), pi=("pi", lambda s: ",".join(sorted(set(s)))),
            test_ids=("test_id", lambda s: ",".join(s)))
       .reset_index())


def parse(text, pi):
    t = text.lower()
    r = dict(proposed_category=None, thickness_mm=None, width_cm=None, rod_diameter_in=None,
             color=None, burn_sides=None, needs_review=False, rationale="")
    if "sibal" in t:
        wm = re.search(r"(\d+)\s*cm", t)
        r.update(proposed_category="cotton_fiberglass_fabric", width_cm=float(wm.group(1)) if wm else None,
                 rationale="SIBAL = tela 75/25 algodón/fibra de vidrio (ReadMe)")
    elif "nomex" in t:
        r.update(proposed_category="aramid_fabric", rationale="Nomex III")
    elif "candle" in t:
        r.update(proposed_category="wax_candle", rationale="vela de cera japonesa")
    elif "spherical" in t:
        r.update(proposed_category="pmma_sphere", needs_review=True,
                 rationale="ReadMe: '4 cm pmma spherical section'; el texto no dice PMMA")
    elif "rod" in t:
        r["proposed_category"] = "pmma_rod"
        m = re.search(r"(\d+)\s*/\s*(\d+)", t) or re.search(r"(0?\.\d+)", t)
        r["rod_diameter_in"] = round(int(m.group(1)) / int(m.group(2)), 4) if m and m.lastindex == 2 else (float(m.group(1)) if m else None)
        r["color"] = "black" if "blac" in t else ("clear" if "clear" in t else None)
        r["rationale"] = "varilla PMMA (ReadMe: Olson/Fernandez-Pello)"
        if "blac " in t + " ":
            r["needs_review"], r["rationale"] = True, r["rationale"] + "; 'blac' = typo de black"
    else:
        um = re.search(r"(\d+)\s*micron", t)
        mm = re.search(r"(\d+(?:\.\d+)?)\s*mm", t)
        thick = int(um.group(1)) / 1000 if um else (float(mm.group(1)) if mm else None)
        r["thickness_mm"] = thick
        wm = re.search(r"(\d+)\s*cm", t)
        r["width_cm"] = float(wm.group(1)) if wm else None
        r["burn_sides"] = 1 if "1 sided" in t else (2 if "2 sided" in t else None)
        # umbral propuesto: película delgada <= 0.4 mm (Bhattacharjee), placa >= 1 mm (Miller); no hay valores intermedios
        r["proposed_category"] = "pmma_thin_film" if thick is not None and thick <= 0.4 else "pmma_thick_sheet"
        r["rationale"] = "PMMA plano; umbral película <=0.4 mm / placa >=1 mm"
        if "pmma" not in t:
            r["needs_review"], r["rationale"] = True, r["rationale"] + "; texto no dice PMMA (se asume por ReadMe/PI)"
        if "2ide" in t or "2 cm thick" in t:
            r["needs_review"], r["rationale"] = True, r["rationale"] + "; probable typo ('2ide'→wide / '2 cm thick'→wide)"
    if "ign" in t or "igniter" in t:
        r["needs_review"], r["rationale"] = True, r["rationale"] + "; variante de ignición en el texto (no es material)"
    return r


rows = [dict(material_raw=x.material_raw, n_tests=x.n_tests, pi=x.pi, **parse(x.material_raw, x.pi), test_ids=x.test_ids)
        for x in g.itertuples()]
out = pd.DataFrame(rows).sort_values(["proposed_category", "material_raw"])
out.to_csv("docs/material_mapping_proposal.csv", index=False)
print(out.groupby("proposed_category").agg(textos=("material_raw", "size"), pruebas=("n_tests", "sum")))
print("needs_review:", out.needs_review.sum(), "textos")
