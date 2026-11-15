# Data dictionary — `data/processed/`

Built by `scripts/build_processed.py` from `data/raw/`, which is never modified.
The raw files are downloaded and verified with `scripts/fetch_psi.py`.
Source: NASA Physical Sciences Informatics (PSI), licence CC0-1.0.

Conventions:
- Names are snake_case, with the unit at the end (`_mm`, `_mm2_s`, `_mmhg`, `_pct_vol`, `_ppm`, `_cm_s`).
- Empty cells are null. Non-numeric text in a numeric column ("–", "none", "OR") becomes null.
- `qc_flags` lists issues separated by `;`. Empty = no issue detected. No row is ever dropped.

---

## `flex_tests.csv` — FLEX (PSI-69), 274 tests, one row per test

Source: `PSI-69_Experimental table_FLEX.csv` (cp1252).

| Column | Type | Unit | Original column | Notes |
|---|---|---|---|---|
| `flex_test_number` | int | — | FLEX Test # | |
| `flex_id` | str | — | FLEX Identifier | E.g. `20CAL10`. The `*CAL*` tests are in the PSI *Calibration* folder; the others in *Raw Data*. |
| `test_date` | ISO date | — | Test Date | The original mixes `m/d/YYYY` and `m/d/YY`; both are accepted. |
| `test_time_gmt` | str HH:MM:SS | GMT | Test GMT | 1 null (30CAL07). |
| `fuel` | str | — | Fuel | `methanol` \| `heptane` |
| `pressure_mmhg` | float | mmHg | Ambient pressure; mmHg | **C11M201 had 0.0 → set to null** (flag `pressure_zero_set_null`). |
| `pressure_atm` | float | atm | *(derived)* | `pressure_mmhg / 760`. |
| `o2_mole_fraction` | float | mole fraction | **"O** initial ambient composition" | The subscripts were lost in the CSV: "O" = O₂. |
| `n2_mole_fraction` | float | mole fraction | **"N** initial …" | "N" = N₂ (diluent). |
| `co2_mole_fraction` | float | mole fraction | **"CO** initial …" | **"CO" = CO₂** (suppressant), not carbon monoxide. See *Evidence* below. |
| `he_mole_fraction` | float | mole fraction | He initial … | Helium (suppressant). |
| `droplet_initial_diameter_mm` | float | mm | Droplet initial diameter; mm | `–` → null. |
| `flame_extinction_diameter_mm` | float | mm | Visible flame extinction diameter; mm | Nulls: 13/27 completion, 37/61 disruption, 27/186 extinction. ⚠️ 14 `completion` tests **do** have a value, which does not fit "burned to completion": check before using it. |
| `burning_rate_mm2_s` | float | **mm²/s** | Burning rate; **mm** | **Unit corrected.** See below. |
| `burn_time_s` | float | s | Burn time; s | `~6` → 6 with `burn_time_is_approx = true`. |
| `burn_time_is_approx` | bool | — | *(derived)* | True if the original had `~`. |
| `test_end` | str | — | Test end | `extinction` \| `disruption` \| `completion`. See the definitions below. |
| `qc_flags` | str | — | — | `pressure_zero_set_null`, `mole_fractions_do_not_sum_to_1` (\|Σ−1\| > 0.015; 6 rows), `burn_time_approx`, `test_date_unparsed`, `duplicate_flex_id` (193F001). |
| `source_file` | str | — | — | |

### Unit correction: `burning_rate`
The original labels the burning rate as **"mm"**. It is the d²-law constant (K = −d(D²)/dt) and its unit is **mm²/s**:
1. The per-test result files of the same repository (`PSI-69_Raw Data_Test 002 Results.xls`, `…30CAL07-Test009 Results.xls`) call it `Burning Rate (mm2/s)` and plot `t/D0² (mm²/s)`.
2. The values (0.05–1.06) are in the typical K range for methanol and heptane droplets (~0.4–0.8 mm²/s).
3. A length in mm makes no sense as a "rate".

**Only the name and the unit were corrected; the numeric values do not change.**

⚠️ **Unresolved discrepancy:** for 20CAL10 the CSV says K = 0.60, D₀ = 1.86 and D_ext = 0.94. The `.xls` of the same test says K = 0.5356, D₀ = 1.850 and D_ext = 0.920. It was not corrected: the CSV value (the official Experiment Table) is used. Worth checking if K is used quantitatively.

### Definition of `test_end`
- `completion`: the droplet burned completely, "as opposed to extinguishing at a finite droplet size" (FLEX Test Plan, PDF p.4 / printed p.44, step 3).
- `extinction`: the flame went out while the droplet still had a finite size (same passage, steps 5–6).
- `disruption`: **not defined in the Science Documents.** In the droplet literature "disruption" usually means micro-explosion or fragmentation of the droplet. This is an **unconfirmed interpretation**.

---

## `bass2_tests.csv` — BASS-II (PSI-25), 129 tests, one row per test

Source: `PSI-25_Experimental table_BASS-II.csv` joined 1:1 on `Test #` with the sheets of `PSI-25_Science Documents_BASS-II_Test.Matrices.xlsx`. All 129 rows match.
Column definitions come from the **BASS-II ReadMe** (`PSI-25_Science Documents_BASS-II_ReadMe.docx`, section "Columns in test matrix"; the document has no page numbers).

| Column | Type | Unit | Notes |
|---|---|---|---|
| `pi` | str | — | Principal investigator (one sheet per PI in Test.Matrices). |
| `test_id` | str | — | PI initial + number; `a`/`b` = several runs with the same sample on the same day. |
| `test_date` | date | — | Real date. The video shows one day more because of a leap-year error (ReadMe). |
| `gmt_day_of_year` | int | day of year | "GMT" column (ReadMe: "number is day of the year"). |
| `sample_id` | str | — | A sample can be used in several tests. |
| `material_raw` | str | — | Original text with normalised spaces. 49 variants. Not modified. |
| `material_category` | str | — | From `docs/material_mapping.csv` (approved by the team's data lead, 14 Nov): `pmma_rod` (54), `cotton_fiberglass_fabric` (27, SIBAL fabric), `pmma_thin_film` (22), `pmma_thick_sheet` (20), `aramid_fabric` (3, Nomex III), `pmma_sphere` (2), `wax_candle` (1). |
| `thickness_mm` | float | mm | Thickness of films and sheets. Film ≤0.4 mm, sheet ≥1 mm (there are no values in between). |
| `width_cm` | float | cm | Width of the flat sample or the fabric. M5 and M19 = 2 cm (typos in the text). |
| `rod_diameter_in` | float | inches | Rod diameter (0.25, 0.375, 0.5). |
| `color` | str | — | `clear` \| `black` (rods only). **Do not average rods of different colours together**: black PMMA absorbs radiation differently (team decision). P14 "blac" = black (corrected by the data lead; flag `fer_corrected`). |
| `burn_sides` | int | — | 1 or 2 sides. **Empty = not specified**, not "2 sides" (team decision). |
| `flow_restrictor` | int | — | 0 = maximum flow / least restriction, 2 = minimum flow (ReadMe). |
| `radiometer_gain_raw` | str | — | **Uncalibrated** gain (ReadMe). Values like `250>50` = changed during the test. |
| `total_frames_shot` | int | — | Nikon camera photos. Texts such as `video` → null. |
| `o2_initial_pct_vol`, `o2_final_pct_vol` | float | % vol | O₂ calibrated with an offset against the ISS MCA (ReadMe). |
| `co2_initial_pct_vol`, `co2_final_pct_vol` | float | % vol | CDM sensor. |
| `co_initial_ppm`, `co_final_ppm` | float | ppm | CSA-CP sensor. `OR`/`over` = over range (>1000 ppm) → null + `co_*_over_range = true`. |
| `co_initial_over_range`, `co_final_over_range` | bool | — | |
| **`ai_outcome`** | str | — | **Extracted by AI.** `extinction` \| `blowoff` \| `no_ignition` \| `not_sustained` \| null |
| **`ai_extinguished`** | bool | — | **AI.** True if the text mentions extinction or blowoff. **Null ≠ "it did not go out"**: it only means the note does not say. |
| **`ai_extinction_mode`** | str | — | **AI.** `low_flow` (the flow was lowered until extinction) \| `blowoff_high_flow` |
| **`ai_fan_pot_at_extinction`** | float | pot position (0–10) | **AI.** Fan potentiometer position written next to "ext"/"blowoff". `0` = fan off. It is a **control position, not a speed**; converting it to cm/s needs `Fan calibration data.xlsx` (not applied). |
| **`ai_initial_air_speed_cm_s`** | float | cm/s | **AI.** First *Air display* value ("flow speed measured in the duct in cm/s", ReadMe; slow response, ~1 min). If the first number is > 40 it is a fan reading → the value next to `cm/s` or in brackets is used (O5b, O13a). |
| `extracted_by` | str | — | `AI`; applies to every `ai_*` column. |
| `raw_note` | str | — | Original text: `Fan display: … \| Air display: …` (from Test.Matrices). |
| `qc_flags` | str | — | See below. |
| `source_file` | str | — | |

### AI extraction rules (`ai_*`)
Claude (Opus 5.5) read the 129 notes one by one on 2026-11-14. The rules are in `ai_extract()` in `scripts/build_processed.py`, and the 26 rows with an outcome were checked by hand against `raw_note`.
- `no ign` → `no_ignition` (O12)
- `would not stay lit` → `not_sustained` (P8)
- `blowoff` / `blow off` → `blowoff` (B18, B19, O7, O8b, O9, O11, O22)
- `ext`, `extinguished`, `out` → `extinction` (17 tests)
- Left **null** on purpose because they are ambiguous:
  - P4 and P6 ("pots … off": it is unclear whether the flame or the fan went off).
  - O13b ("7, 4? (49, ?)").
  - F4 ("see notes": the notes are not in PSI).
  - Every test without a keyword (103).
- `ai_fan_pot_at_extinction` stays null when the extinction pot is not explicit (B14, B21, O14, O19, P1: "5 down to ext"; B18/B19: "incr to 7.0 / 6.0" without saying at which value the blowoff happened).

### BASS-II `qc_flags` (no value was corrected; they were only flagged)
| Flag | Tests | Reason |
|---|---|---|
| `o2_final_implausibly_low` (< 5 %) | B2 (1.6), P22a (0.6), T28a (0.9) | Impossible in the ISS cabin; probably an entry error. |
| `o2_final_implausibly_high` (> 30 %) | P22b (39.1), T28b (40.4) | Same. The a/b pairs suggest values shifted between columns. |
| `date_year_inconsistent_with_gmt` | T9, T18 | The date says 2018 but GMT 175 matches 2014-06-24. Probably a year error. |
| `co_over_range_gt_1000ppm` | O4, O12, O13b | CO "OR"/"over" (>1000 ppm). |
| `co_final_censored` | M5 | Final CO ">500" in the original: it is a lower bound. `co_final_ppm` stays null; nothing is imputed. |
| `co_initial_negative` | B4, B21, B22, M10, O1, O2, O5a, O20, T25, T26, T27, T28a, T29 (13) | Initial CO −1 to −3 ppm (probably a sensor offset). The value is kept. |
| `material_assumed_from_readme` | B3, B5, B7, B12, B13, T3, T7 | The text does not say "PMMA"; it is assumed from the ReadMe and the PI. Approved by the team's data lead, who asked to keep the flag. |
| `material_text_typo` | M5, M19 | The text has a typo ("2 cm thick", "2ide"); the width was taken as 2 cm. Approved by the data lead, with the flag. |
| `fer_corrected` | P14 | The data lead corrected a value derived from the text: "1/4 blac rod" → `color` = black. The original text (`material_raw`) is not modified. Every correction of this kind must carry the flag (test `test_fer_corrected_marks_every_corrected_value`). |
| `low_confidence` | P5, P13a, O6 | Ambiguous AI extraction (P5/P13a: pot 0 at extinction; O6: "out .275" without "ext"). Pending human review; `src/psi_queries.py` adds `low_confidence_warning` to every aggregated row that includes them. |

The BASS-II table **has no pressure column**: the tests ran in the Microgravity Science Glovebox at cabin pressure.

---

## Evidence from the Science Documents
| Question | Answer | Source |
|---|---|---|
| Is "CO" in FLEX CO₂? | Yes. The plan defines the suppressant matrices with mole fractions X_O2, X_CO2 and X_He, with `X_N2 = 1.0 − X_O2 − X_CO2`. CO is not mentioned as a test variable. | *FLEX_Test_Plan.pdf*, Table 8 (PDF p.8 / printed p.48) and Table 9 He (PDF p.10 / printed p.50) |
| Unit of He / CO₂? | Mole fraction | Same tables |
| What is "Disruption"? | **It does not appear in the Science Documents** (Test Plan, DoD). Only burn-to-completion and extinction are defined. | *FLEX_Test_Plan.pdf* PDF p.4 / printed p.44 |
| Units of the FLEX radiometer? | **They do not appear in the Science Documents.** In `Radiometer_Readings.txt` the samples have an empty unit `()`. | — |
| Units of the BASS-II radiometer? | "Uncalibrated radiometer gain … useful for relative flame intensity": relative, uncalibrated. | *BASS-II_ReadMe.docx*, "Columns in test matrix" |

---

## `experiments.csv` / `psi.sqlite` — unified FLEX + BASS-II table (403 rows)

Built by `scripts/build_experiments.py`. SQLite: table `experiments`, views `v_flex` and `v_bass2`, and a non-unique index
on `(program, test_id)`. Example queries in `docs/sql_examples.sql` (run with `scripts/run_sql_examples.py`).

| Column | FLEX | BASS-II |
|---|---|---|
| `program` | `FLEX` | `BASS-II` |
| `test_id` | `flex_id` (⚠️ not unique: 193F001 appears twice) | `test_id` |
| `date` | `test_date` | `test_date` |
| `material_or_fuel` | `methanol` / `heptane` | `material_raw` (original text) |
| `material_category` | `liquid_fuel_droplet` | `material_category` from `bass2_tests.csv` (approved mapping) |
| `o2_fraction` | mole fraction **set** by the test | `o2_initial_pct_vol / 100`: O₂ **measured** in the chamber |
| `pressure_atm` | `pressure_atm` | null (not recorded) |
| `co2_fraction` | mole fraction of the **added suppressant** | `co2_initial_pct_vol / 100`: **measured background** CO₂ (≤1.85 %), not a suppressant |
| `he_fraction` | suppressant mole fraction | null |
| `outcome` | `extinction` / `disruption` / `completion` | `extinction` / `blowoff` / `no_ignition` / `not_sustained` / null |
| `outcome_source` | `observed` | `ai_extracted` (26) / `not_stated` (103) |
| `extinction_diameter_mm` | only if `outcome = extinction`; otherwise null (38 values dropped → flag `extinction_diameter_dropped_outcome_not_extinction`) | null |
| `burning_rate_mm2_s` | d²-law K | null |
| `qc_flags` | flags of `flex_tests.csv` + the one above | flags of `bass2_tests.csv` |
| `source_doi` | `10.60555/mbq8-0451` | `10.60555/4qc4-de67` |

---

## Known limitations

### Coverage and origin
1. **Only the Experiment Tables were processed.** The ~630 FLEX per-test files (Chamber/Radiometer Readings) are not
   used, nor the BASS-II videos or images (~275 GB), nor the FLEX ones (~920 GB). There is only one sample (20CAL10).
2. SoFIE is not an investigation in PSI (none has that acronym or title), but the BASS-II (PSI-25) objectives mention it: "Provide SoFIE PIs with preliminary data to refine Science Requirements". Of Combustion Science, only BASS-II and FLEX were processed (out of 24 investigations).
3. 4 Science Documents were consulted (FLEX DoD, FLEX Test Plan, BASS-II ReadMe, BASS-II SRD). The Engineering
   Documents, Presentations and the BASS-II Summary Report (49 MB) were not reviewed.

### FLEX
4. **`burning_rate` unit corrected** from "mm" to mm²/s, in the name only (see above). The evidence is indirect
   (`.xls` files and physical range); no Science Document states it explicitly.
5. **"CO" was read as CO₂**, supported by the Test Plan (Tables 8–9). The "O/N/CO" headers lost their subscripts.
6. **"Disruption" is not defined** in the Science Documents. The "micro-explosion/fragmentation" reading is not confirmed.
7. **FLEX radiometer units unknown:** the `.txt` has an empty `()` and they do not appear in the Science Documents.
8. The Experiment Table and the per-test `.xls` files **do not match** (20CAL10: K 0.60 vs 0.536; D₀ 1.86 vs 1.850; D_ext 0.94 vs 0.920).
   The Experiment Table is used.
9. **14 `completion` and 24 `disruption` tests have an extinction diameter**, which contradicts their outcome. In
   `experiments.csv` they are dropped (rule "only if extinction") with a flag; in `flex_tests.csv` they are kept.
10. `flex_id` **193F001 duplicated** (#70 and #73, same date and time, different D₀/K). Both rows are kept with the flag `duplicate_flex_id`.
11. C11M201 had a pressure of 0.0 mmHg → null. 6 tests have mole fractions that do not add up to 1 (±0.015).
    Dates in two formats (m/d/YYYY and m/d/YY). 2 approximate burn times (`~`).
12. **The design is neither random nor balanced:** the Test Plan (PDF p.4 / printed p.44) describes an iterative
    procedure that approaches the extinction limit. The per-cell "extinction %" values **are not probabilities** and the
    CO₂/He effects are **confounded with O₂** (the average O₂ changes between suppressant levels). Several
    cells have n ≤ 5.

### BASS-II
13. **The BASS-II outcome is not recorded as data**; it was extracted by AI from the *Fan/Air display* text
    (26/129). 103 tests remain `not_stated`, which does **not** mean there was no extinction. BASS-II extinction rates
    are not comparable with FLEX ones.
14. `ai_fan_pot_at_extinction` is a **potentiometer position (0–10)**, not a speed. `Fan calibration data.xlsx` was not
    applied to convert it to cm/s.
15. *Air display* responds slowly (~1 min, ReadMe) and sometimes contains fan readings (O5b, O13a).
16. BASS-II O₂ and CO₂ are **measured**, not set. In `experiments.csv` they share a column with the FLEX ones, which
    are set by design. BASS-II CO₂ is background (≤1.85 %), not a suppressant.
17. Impossible values flagged and **not corrected**: final O₂ of B2 (1.6 %), P22a/P22b (0.6/39.1 %), T28a/T28b (0.9/40.4 %).
    T9/T18 have the year 2018 with a 2014 GMT. CO "OR" (>1000 ppm) in O4, O12, O13b.
18. **`material_category` groups 49 free texts into 7 categories** (`docs/material_mapping.csv`, approved by the team's
    data lead). The ignition variants ("moved igniter", "top side ign", T23/T24) are not materials: they map to SIBAL.
    7 tests have their material assumed from the ReadMe and 2 have a typo (see the flags above).
19. No pressure is recorded; the ReadMe does not explain the ignition variants ("top side ign", "moved igniter");
    F4 says "see notes", but those notes are not in PSI.

### Process
20. Every transformation is reproducible with `fetch_psi.py` → `build_processed.py` → `build_experiments.py`, but
    the AI extraction rules were tuned by reviewing these 129 texts by hand; they are not validated on other data.

---

## `src/psi_queries.py` and `coverage_grid.json`

- `src/psi_queries.py`: the 6 queries as parameterised functions (`program`, `fuel`/`material`, `o2_range`,
  `pressure_range`, `suppressant` ∈ {any, none, co2, he}). It uses only the stdlib sqlite3 and opens the database read
  only. Every row carries `n`, `qc_flags` (list) and `source_doi` (list). Every row with `pct_*` carries
  `pct_note = "descriptive, not a probability"` and `warning` (`null`, or a mandatory text if `n < 5`). The texts are
  in English because they reach the UI. Also: `list_experiments` (rows with filters, `outcome`, `limit`, `offset`)
  and `meta` (valid values and ranges), for `/experiments` and `/meta`. Each endpoint and its function are in `docs/API.md`.
- Q6 (BASS-II) does **not** report an extinction %; only counts and `pct_outcome_stated`, because the outcome is incomplete.
- O₂ bands (fraction): `<0.15` = [0, 0.15), `0.15-0.18`, `0.18-0.21`, `0.21-0.24`, `>=0.24` = [0.24, 1]. 0.21 (air)
  opens the 4th band. Rows are ordered by O₂ value, not by label.
- `data/processed/coverage_grid.json` (`scripts/build_coverage_grid.py`): FLEX by fuel × O₂ band ×
  pressure (`pressure_atm_level`: 0.1 atm, or `unknown` = null) × suppressant (none/co2/he). Cells use the same
  names as `flex_coverage_grid()` and the API: `n`, `avg_burning_rate_mm2_s`, `avg_extinction_diameter_mm` (extinction
  only), `pct_extinction` + `pct_note`, O₂ and suppressant ranges, counts by outcome, `qc_flags`, `source_doi`.
  49 cells, **25 with n<5**.
- Tests: `tests/test_psi_queries.py` (with pytest, or `python3 tests/test_psi_queries.py` if pytest is not installed).
