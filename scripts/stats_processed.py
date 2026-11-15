"""Descriptive statistics of data/processed/*.csv"""
import pandas as pd
f = pd.read_csv("data/processed/flex_tests.csv")
b = pd.read_csv("data/processed/bass2_tests.csv")

def nulls(df, name):
    data = df.drop(columns=["qc_flags"])  # empty qc_flags = no issues, not a missing value
    measured = data[[c for c in data.columns if not c.startswith("ai_")]]
    print(f"\n[{name}] rows: {len(df)} | with >=1 null (measured columns): {measured.isna().any(axis=1).sum()}"
          + (f" | with >=1 null including ai_*: {data.isna().any(axis=1).sum()}" if len(measured.columns) < len(data.columns) else ""))
    s = df.isna().sum(); print("  nulls per column:", s[s > 0].to_dict())

print("=========== FLEX")
print("combustibles:", f.fuel.value_counts().to_dict())
print("resultado (test_end):", f.test_end.value_counts().to_dict())
print(pd.crosstab(f.fuel, f.test_end, margins=True))
for c in ["o2_mole_fraction", "co2_mole_fraction", "he_mole_fraction", "pressure_mmhg", "pressure_atm",
          "droplet_initial_diameter_mm", "burning_rate_mm2_s"]:
    print(f"  {c:30} min={f[c].min():<8} max={f[c].max():<8} n={f[c].notna().sum()}")
print("presiones distintas (atm, redondeadas):", sorted(f.pressure_atm.round(1).dropna().unique()))
print("tests with CO2>0:", (f.co2_mole_fraction > 0).sum(), "| with He>0:", (f.he_mole_fraction > 0).sum())
nulls(f, "flex_tests")

print("\n=========== BASS-II")
mat = b.material_raw.str.lower()
cls = pd.Series("otro", index=b.index)
for k, v in [("sibal", "SIBAL (cotton/fibreglass)"), ("nomex", "Nomex III"), ("candle", "Japan Wax candle"),
             ("spher", "PMMA spherical section"), ("rod", "PMMA rod"), ("slab", "PMMA slab/film (thickness in mm/µm)"), ("film", "PMMA thin film"),
             ("thick", "PMMA slab/film (thickness in mm/µm)"), ("micron", "PMMA thin film")]:
    cls[(cls == "otro") & mat.str.contains(k)] = v
print("material (agrupado):", cls.value_counts().to_dict())
print("unique material_raw:", b.material_raw.nunique())
print("PI:", b.pi.value_counts().to_dict())
print("ai_outcome:", b.ai_outcome.value_counts(dropna=False).to_dict())
for c in ["o2_initial_pct_vol", "o2_final_pct_vol", "co2_initial_pct_vol", "co_final_ppm", "ai_initial_air_speed_cm_s"]:
    print(f"  {c:28} min={b[c].min():<8} max={b[c].max():<8} n={b[c].notna().sum()}")
print("  pressure: no column; BASS-II ran at ISS cabin pressure (not recorded in the table)")
print("qc_flags:", b.qc_flags.value_counts().to_dict())
nulls(b, "bass2_tests")
