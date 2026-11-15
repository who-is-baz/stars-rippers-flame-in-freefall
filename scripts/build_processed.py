#!/usr/bin/env python3
"""Genera data/processed/flex_tests.csv y data/processed/bass2_tests.csv a partir de data/raw/ (solo lectura).

Uso: python3 scripts/build_processed.py
Requiere: pandas, openpyxl. Ver docs/data-dictionary.md para la definición de cada columna.
"""
import os, re
import numpy as np
import pandas as pd

RAW = "data/raw"
OUT = "data/processed"
FLEX_CSV = f"{RAW}/FLEX/PSI-69_Experimental table_FLEX.csv"
BASS_CSV = f"{RAW}/BASS-II/PSI-25_Experimental table_BASS-II.csv"
BASS_XLSX = f"{RAW}/BASS-II/PSI-25_Science Documents_BASS-II_Test.Matrices.xlsx"
MATERIAL_MAP = "docs/material_mapping.csv"  # mapeo aprobado por el equipo
MMHG_PER_ATM = 760.0
# BASS-II: extracciones de IA con texto ambiguo (P5, P13a: pot 0 al extinguirse; O6: "out" sin "ext").
# Se marcan `low_confidence` hasta que una persona las revise; quitarlas de aquí cuando se aprueben.
AI_LOW_CONFIDENCE = {"P5", "P13a", "O6"}


def num(s):
    """Convierte a float; textos como '–', 'none', 'OR' quedan como NaN."""
    return pd.to_numeric(s.astype(str).str.strip().str.replace("~", "", regex=False), errors="coerce")


def parse_date(s):
    """Fechas m/d/YYYY o m/d/YY (el original mezcla ambos formatos). Lo no reconocido queda NaT."""
    s = s.astype(str).str.strip()
    d = pd.to_datetime(s, format="%m/%d/%Y", errors="coerce")
    d = d.fillna(pd.to_datetime(s, format="%m/%d/%y", errors="coerce"))
    return d.dt.date


def add_flag(flags, mask, name):
    return np.where(mask, np.where(flags == "", name, flags + ";" + name), flags)


# ----------------------------------------------------------------------------- FLEX
def build_flex():
    raw = pd.read_csv(FLEX_CSV, encoding="cp1252", dtype=str)
    c = list(raw.columns)
    df = pd.DataFrame({
        "flex_test_number": num(raw[c[0]]).astype("Int64"),
        "flex_id": raw[c[1]].str.strip(),
        "test_date": parse_date(raw[c[2]]),
        "test_time_gmt": raw[c[3]].str.strip(),
        "fuel": raw[c[4]].str.strip().str.lower(),
        "pressure_mmhg": num(raw[c[5]]),
        # En el CSV los subíndices se perdieron: "O"=O2, "N"=N2, "CO"=CO2 (ver data-dictionary.md)
        "o2_mole_fraction": num(raw[c[6]]),
        "n2_mole_fraction": num(raw[c[7]]),
        "co2_mole_fraction": num(raw[c[8]]),
        "he_mole_fraction": num(raw[c[9]]),
        "droplet_initial_diameter_mm": num(raw[c[10]]),
        "flame_extinction_diameter_mm": num(raw[c[11]]),
        # CORRECCIÓN DE UNIDADES: el original dice "Burning rate; mm", pero es la constante K de la
        # ley d² en mm²/s. El valor numérico no cambia; solo se corrige la unidad en el nombre.
        "burning_rate_mm2_s": num(raw[c[12]]),
        "burn_time_s": num(raw[c[13]]),
        "burn_time_is_approx": raw[c[13]].fillna("").str.strip().str.startswith("~"),
        "test_end": raw[c[14]].str.strip().str.lower(),
    })
    flags = np.full(len(df), "", dtype=object)
    zero_p = df["pressure_mmhg"] <= 0
    flags = add_flag(flags, zero_p, "pressure_zero_set_null")
    df.loc[zero_p, "pressure_mmhg"] = np.nan
    df.insert(df.columns.get_loc("pressure_mmhg") + 1, "pressure_atm", (df["pressure_mmhg"] / MMHG_PER_ATM).round(4))
    mole_sum = df[["o2_mole_fraction", "n2_mole_fraction", "co2_mole_fraction", "he_mole_fraction"]].sum(axis=1)
    flags = add_flag(flags, (mole_sum - 1).abs() > 0.015, "mole_fractions_do_not_sum_to_1")
    flags = add_flag(flags, df["burn_time_is_approx"], "burn_time_approx")
    flags = add_flag(flags, df["test_date"].isna(), "test_date_unparsed")
    flags = add_flag(flags, df["flex_id"].duplicated(keep=False), "duplicate_flex_id")
    df["qc_flags"] = flags
    df["source_file"] = os.path.basename(FLEX_CSV)
    return df


# ----------------------------------------------------------------------------- BASS-II
NUM_RE = r"(\d+(?:\.\d+)?|\.\d+)"


def first_number(text):
    m = re.match(r"\s*" + NUM_RE, text or "")
    return float(m.group(1)) if m else np.nan


MAX_AIR_SPEED_CM_S = 40.0  # O20: "incr to max 38.5"; por encima, el número es una lectura del ventilador


def initial_air_speed(air_l):
    """Primer valor de Air display (cm/s). Si supera MAX_AIR_SPEED_CM_S es una lectura del ventilador
    escrita en la columna equivocada (O5b "49, 5 cm/s"; O13a "49,44,... (5, 2, 0)"): se usa el número
    junto a 'cm/s' o el primero entre paréntesis; si no hay, queda nulo."""
    v = first_number(air_l)
    if not (v > MAX_AIR_SPEED_CM_S):
        return v
    m = re.search(NUM_RE + r"\s*cm/s", air_l) or re.search(r"\(\s*" + NUM_RE, air_l)
    return float(m.group(1)) if m else np.nan


def ai_extract(fan, air):
    """Extracción del resultado a partir del texto libre de Fan display / Air display.

    Reglas (decididas leyendo las 129 notas; ver data-dictionary.md):
      no_ignition    -> 'no ign'
      not_sustained  -> 'would not stay lit'
      blowoff        -> 'blowoff' / 'blow off' (extinción por flujo alto)
      extinction     -> 'ext', 'extinguished', 'out' (extinción al bajar el flujo)
      None           -> sin mención explícita (NO significa que no hubo extinción)
    """
    fan_l, air_l = (fan or "").lower(), (air or "").lower()
    text = f"{fan_l} | {air_l}"
    out = {"ai_outcome": None, "ai_extinguished": None, "ai_extinction_mode": None,
           "ai_fan_pot_at_extinction": np.nan, "ai_initial_air_speed_cm_s": initial_air_speed(air_l)}
    if "no ign" in text:
        out.update(ai_outcome="no_ignition")
        return out
    if "would not stay lit" in text:
        out.update(ai_outcome="not_sustained")
        return out
    if re.search(r"blow\s?off", text):
        out.update(ai_outcome="blowoff", ai_extinguished=True, ai_extinction_mode="blowoff_high_flow")
        m = re.search(r"blow\s?off\s*(?:fan\s*)?(?:pot|pt|max)?\s*" + NUM_RE, fan_l)
        if m:
            out["ai_fan_pot_at_extinction"] = float(m.group(1))
        return out
    if re.search(r"ext\b|ext\s|extinguish|\bout\b", text) or text.rstrip().endswith("ext"):
        out.update(ai_outcome="extinction", ai_extinguished=True, ai_extinction_mode="low_flow")
        m = (re.search(NUM_RE + r"\s*,?\s*(?:ext|extinguished)", fan_l)
             or re.search(r"\bout\s*" + NUM_RE, fan_l)
             # a veces anotan los pots en Air display (P10); solo si la nota dice "pot", porque
             # si no, el número es una velocidad del aire en cm/s (ej. B14: "5,3,2, ext")
             or ("pot" in air_l and re.search(NUM_RE + r"\s*,?\s*(?:ext|extinguished)", air_l)))
        if m:
            out["ai_fan_pot_at_extinction"] = float(m.group(1))
        return out
    return out


def build_bass2():
    e = pd.read_csv(BASS_CSV, encoding="utf-8-sig", dtype=str)
    sheets = pd.read_excel(BASS_XLSX, sheet_name=None, header=0, dtype=str)
    tm = []
    for name, s in sheets.items():
        s = s.copy()
        s.columns = [str(col).strip() for col in s.columns]
        s = s.rename(columns={"Test no.": "test_id", "Fan display": "tm_fan", "Air display": "tm_air"})
        tm.append(s[["test_id", "tm_fan", "tm_air"]].assign(tm_sheet=name))
    tm = pd.concat(tm, ignore_index=True)
    tm["test_id"] = tm["test_id"].str.strip()
    e["Test #"] = e["Test #"].str.strip()
    m = e.merge(tm, left_on="Test #", right_on="test_id", how="left", validate="one_to_one")
    assert m["tm_sheet"].notna().all(), "hay pruebas sin fila en Test.Matrices"

    col = {re.sub(r"\s+", " ", k).strip(): k for k in e.columns}
    co_i, co_f = m[col["Initial CO (ppm)"]].fillna(""), m[col["Final CO (ppm)"]].fillna("")
    df = pd.DataFrame({
        "pi": m["PI"].str.strip(),
        "test_id": m["Test #"],
        "test_date": parse_date(m["Date"]),
        "gmt_day_of_year": num(m["GMT"]).astype("Int64"),
        "sample_id": m["Sample #"].str.strip(),
        "material_raw": m["Fuel Sample Material"].str.replace(r"\s+", " ", regex=True).str.strip(),
        "flow_restrictor": num(m["Flow restrictor"]).astype("Int64"),
        "radiometer_gain_raw": m[col["Radiometer gain (1000 250 50 10)"]].str.strip(),
        "total_frames_shot": num(m["Total Frames Shot"]).astype("Int64"),
        "o2_initial_pct_vol": num(m[col["Calibrated initial O2 % by vol"]]),
        "o2_final_pct_vol": num(m[col["Calibrated final O2 % by vol"]]),
        "co2_initial_pct_vol": num(m[col["Initial CO2 % by vol"]]),
        "co2_final_pct_vol": num(m[col["Final CO2 % by vol"]]),
        "co_initial_ppm": num(co_i),
        "co_final_ppm": num(co_f),
        "co_initial_over_range": co_i.str.strip().str.upper().isin(["OR", "OVER"]),
        "co_final_over_range": co_f.str.strip().str.upper().isin(["OR", "OVER"]),
    })
    # Mapeo de materiales aprobado por el equipo (14 nov). Se une por el texto original normalizado.
    mp = pd.read_csv(MATERIAL_MAP, dtype=str).drop(columns="test_ids")
    df = df.merge(mp, on="material_raw", how="left", validate="many_to_one")
    assert df["material_category"].notna().all(), "hay material_raw sin categoría en docs/material_mapping.csv"
    for c in ("thickness_mm", "width_cm", "rod_diameter_in"):
        df[c] = pd.to_numeric(df[c])
    df["burn_sides"] = pd.to_numeric(df["burn_sides"]).astype("Int64")  # vacío = no especificado (no 2 caras)
    pos = df.columns.get_loc("material_raw") + 1
    map_cols = ["material_category", "thickness_mm", "width_cm", "rod_diameter_in", "color", "burn_sides"]
    df = df[list(df.columns[:pos]) + map_cols + [c for c in df.columns[pos:] if c not in map_cols]]
    ai = pd.DataFrame([ai_extract(f, a) for f, a in zip(m["tm_fan"].fillna(""), m["tm_air"].fillna(""))])
    df = pd.concat([df, ai], axis=1)
    df["ai_extinguished"] = df["ai_extinguished"].astype("boolean")
    df["extracted_by"] = "AI"  # aplica a todas las columnas ai_*
    df["raw_note"] = ("Fan display: " + m["tm_fan"].fillna("") + " | Air display: " + m["tm_air"].fillna("")).str.replace(r"\s+", " ", regex=True)

    flags = np.full(len(df), "", dtype=object)
    flags = add_flag(flags, df["o2_final_pct_vol"] < 5, "o2_final_implausibly_low")
    flags = add_flag(flags, df["o2_final_pct_vol"] > 30, "o2_final_implausibly_high")
    flags = add_flag(flags, df["test_date"].map(lambda d: d is not None and not pd.isna(d) and d.year not in (2014, 2016)),
                     "date_year_inconsistent_with_gmt")
    flags = add_flag(flags, df["co_initial_over_range"] | df["co_final_over_range"], "co_over_range_gt_1000ppm")
    # Solo se marca; los valores no cambian (verificación del 14 nov):
    # - CO final censurado: texto ">N" en el original (M5: ">500") queda null en co_final_ppm.
    # - CO inicial negativo (−1 a −3 ppm, probable offset del sensor): se conserva tal cual.
    flags = add_flag(flags, co_f.str.strip().str.startswith(">"), "co_final_censored")
    flags = add_flag(flags, df["co_initial_ppm"] < 0, "co_initial_negative")
    # Extracciones de IA ambiguas: baja confianza hasta revisión humana.
    flags = add_flag(flags, df["test_id"].isin(AI_LOW_CONFIDENCE) & df["ai_outcome"].notna(), "low_confidence")
    # Marcas del mapeo que el equipo pidió conservar: material asumido por el ReadMe / typo en el texto /
    # valor corregido a mano por el equipo (fer_corrected: P14 "blac" -> black; el texto original no se toca).
    for name in ("material_assumed_from_readme", "material_text_typo", "fer_corrected"):
        flags = add_flag(flags, df["material_flag"].eq(name), name)
    df = df.drop(columns="material_flag")
    df["qc_flags"] = flags
    df["source_file"] = os.path.basename(BASS_CSV) + " + " + os.path.basename(BASS_XLSX) + ":" + m["tm_sheet"]
    return df


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    flex, bass = build_flex(), build_bass2()
    flex.to_csv(f"{OUT}/flex_tests.csv", index=False)
    bass.to_csv(f"{OUT}/bass2_tests.csv", index=False)
    print(f"flex_tests.csv: {flex.shape}   bass2_tests.csv: {bass.shape}")
