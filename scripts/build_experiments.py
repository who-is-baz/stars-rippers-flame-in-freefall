#!/usr/bin/env python3
"""Joins flex_tests.csv and bass2_tests.csv into data/processed/experiments.csv and loads it into data/processed/psi.sqlite.

Usage: python3 scripts/build_experiments.py   (after scripts/build_processed.py)
Uses only pandas + sqlite3 (stdlib). It neither reads nor writes data/raw/.
"""
import os, sqlite3
import numpy as np
import pandas as pd

P = "data/processed"
DOI = {"FLEX": "10.60555/mbq8-0451", "BASS-II": "10.60555/4qc4-de67"}  # from /geode-py/ws/repo/investigations/<ID>
COLS = ["program", "test_id", "date", "material_or_fuel", "material_category", "o2_fraction", "pressure_atm",
        "co2_fraction", "he_fraction", "outcome", "outcome_source", "extinction_diameter_mm",
        "burning_rate_mm2_s", "qc_flags", "source_doi"]


def join_flags(*parts):
    out = []
    for vals in zip(*parts):
        fl = [v for v in vals if isinstance(v, str) and v]
        out.append(";".join(fl) if fl else None)
    return out


def flex_rows():
    f = pd.read_csv(f"{P}/flex_tests.csv")
    is_ext = f["test_end"].eq("extinction")
    dropped = (~is_ext) & f["flame_extinction_diameter_mm"].notna()
    return pd.DataFrame({
        "program": "FLEX",
        "test_id": f["flex_id"],
        "date": f["test_date"],
        "material_or_fuel": f["fuel"],
        "material_category": "liquid_fuel_droplet",
        "o2_fraction": f["o2_mole_fraction"],
        "pressure_atm": f["pressure_atm"],
        "co2_fraction": f["co2_mole_fraction"],
        "he_fraction": f["he_mole_fraction"],
        "outcome": f["test_end"],
        "outcome_source": "observed",
        # rule: extinction diameter only when outcome = extinction
        "extinction_diameter_mm": f["flame_extinction_diameter_mm"].where(is_ext),
        "burning_rate_mm2_s": f["burning_rate_mm2_s"],
        "qc_flags": join_flags(f["qc_flags"].fillna(""),
                               np.where(dropped, "extinction_diameter_dropped_outcome_not_extinction", "")),
        "source_doi": DOI["FLEX"],
    })


def bass_rows():
    b = pd.read_csv(f"{P}/bass2_tests.csv")
    has = b["ai_outcome"].notna()
    return pd.DataFrame({
        "program": "BASS-II",
        "test_id": b["test_id"],
        "date": b["test_date"],
        "material_or_fuel": b["material_raw"],
        "material_category": b["material_category"],  # docs/material_mapping.csv (mapping approved by the team)
        # % vol → fraction. It is O2 measured in the chamber, not set by design as in FLEX.
        "o2_fraction": (b["o2_initial_pct_vol"] / 100).round(4),
        "pressure_atm": np.nan,  # not recorded in BASS-II
        # measured background CO2 (CDM sensor), not an added suppressant as in FLEX
        "co2_fraction": (b["co2_initial_pct_vol"] / 100).round(5),
        "he_fraction": np.nan,
        "outcome": b["ai_outcome"],
        "outcome_source": np.where(has, "ai_extracted", "not_stated"),
        "extinction_diameter_mm": np.nan,  # not applicable to solids
        "burning_rate_mm2_s": np.nan,      # not applicable (the d² law is for droplets)
        "qc_flags": join_flags(b["qc_flags"].fillna("")),
        "source_doi": DOI["BASS-II"],
    })


def main():
    exp = pd.concat([flex_rows(), bass_rows()], ignore_index=True)[COLS]
    exp.to_csv(f"{P}/experiments.csv", index=False)

    db = f"{P}/psi.sqlite"
    con = sqlite3.connect(db)
    con.executescript("""
        DROP VIEW IF EXISTS v_flex; DROP VIEW IF EXISTS v_bass2; DROP TABLE IF EXISTS experiments;
        CREATE TABLE experiments (
            program TEXT NOT NULL CHECK (program IN ('FLEX','BASS-II')),
            test_id TEXT NOT NULL,
            date TEXT,
            material_or_fuel TEXT,
            material_category TEXT,
            o2_fraction REAL CHECK (o2_fraction BETWEEN 0 AND 1),
            pressure_atm REAL,
            co2_fraction REAL CHECK (co2_fraction BETWEEN 0 AND 1),
            he_fraction REAL CHECK (he_fraction BETWEEN 0 AND 1),
            outcome TEXT,
            outcome_source TEXT NOT NULL CHECK (outcome_source IN ('observed','ai_extracted','not_stated')),
            extinction_diameter_mm REAL,
            burning_rate_mm2_s REAL,
            qc_flags TEXT,
            source_doi TEXT NOT NULL
        );
        -- not UNIQUE: FLEX repeats the ID 193F001 in two different tests (flag duplicate_flex_id)
        CREATE INDEX ix_experiments_program_test ON experiments (program, test_id);
        CREATE VIEW v_flex  AS SELECT * FROM experiments WHERE program = 'FLEX';
        CREATE VIEW v_bass2 AS SELECT * FROM experiments WHERE program = 'BASS-II';
    """)
    exp.astype(object).where(exp.notna(), None).to_sql("experiments", con, if_exists="append", index=False)
    con.commit()
    n = con.execute("SELECT program, COUNT(*) FROM experiments GROUP BY program").fetchall()
    con.close()
    print("experiments.csv:", exp.shape, "| psi.sqlite:", n)


if __name__ == "__main__":
    main()
