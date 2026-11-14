"""Estadísticas descriptivas de data/processed/*.csv"""
import pandas as pd
f = pd.read_csv("data/processed/flex_tests.csv")
b = pd.read_csv("data/processed/bass2_tests.csv")

def nulls(df, name):
    data = df.drop(columns=["qc_flags"])  # qc_flags vacío = sin problemas, no es un dato faltante
    measured = data[[c for c in data.columns if not c.startswith("ai_")]]
    print(f"\n[{name}] filas: {len(df)} | con >=1 nulo (columnas medidas): {measured.isna().any(axis=1).sum()}"
          + (f" | con >=1 nulo incluyendo ai_*: {data.isna().any(axis=1).sum()}" if len(measured.columns) < len(data.columns) else ""))
    s = df.isna().sum(); print("  nulos por columna:", s[s > 0].to_dict())

print("=========== FLEX")
print("combustibles:", f.fuel.value_counts().to_dict())
print("resultado (test_end):", f.test_end.value_counts().to_dict())
print(pd.crosstab(f.fuel, f.test_end, margins=True))
for c in ["o2_mole_fraction", "co2_mole_fraction", "he_mole_fraction", "pressure_mmhg", "pressure_atm",
          "droplet_initial_diameter_mm", "burning_rate_mm2_s"]:
    print(f"  {c:30} min={f[c].min():<8} max={f[c].max():<8} n={f[c].notna().sum()}")
print("presiones distintas (atm, redondeadas):", sorted(f.pressure_atm.round(1).dropna().unique()))
print("pruebas con CO2>0:", (f.co2_mole_fraction > 0).sum(), "| con He>0:", (f.he_mole_fraction > 0).sum())
nulls(f, "flex_tests")

print("\n=========== BASS-II")
mat = b.material_raw.str.lower()
cls = pd.Series("otro", index=b.index)
for k, v in [("sibal", "SIBAL (algodón/fibra de vidrio)"), ("nomex", "Nomex III"), ("candle", "vela Japan Wax"),
             ("spher", "PMMA sección esférica"), ("rod", "PMMA varilla"), ("slab", "PMMA placa/película (espesor en mm/µm)"), ("film", "PMMA película delgada"),
             ("thick", "PMMA placa/película (espesor en mm/µm)"), ("micron", "PMMA película delgada")]:
    cls[(cls == "otro") & mat.str.contains(k)] = v
print("material (agrupado):", cls.value_counts().to_dict())
print("material_raw únicos:", b.material_raw.nunique())
print("PI:", b.pi.value_counts().to_dict())
print("ai_outcome:", b.ai_outcome.value_counts(dropna=False).to_dict())
for c in ["o2_initial_pct_vol", "o2_final_pct_vol", "co2_initial_pct_vol", "co_final_ppm", "ai_initial_air_speed_cm_s"]:
    print(f"  {c:28} min={b[c].min():<8} max={b[c].max():<8} n={b[c].notna().sum()}")
print("  presión: no hay columna; BASS-II operó a presión de cabina ISS (no registrada en la tabla)")
print("qc_flags:", b.qc_flags.value_counts().to_dict())
nulls(b, "bass2_tests")
