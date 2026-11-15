# NASA Data

All data come from **NASA Physical Sciences Informatics (PSI)**, https://psi.nasa.gov, license **CC0-1.0**
(confirmed on DataCite on 14 Nov 2026). We downloaded the published files once, kept them unchanged (verified by SHA-256)
and built every table and number from them with our scripts.

| Investigation | PSI ID | DOI | What we used | Tests |
|---|---|---|---|---|
| **FLEX** — Flame Extinguishment Experiment (fuel droplets: heptane, methanol) | PSI-69 | [10.60555/mbq8-0451](https://doi.org/10.60555/mbq8-0451) | Experiment table (O2, N2, CO2, He mole fractions, pressure, outcome, extinction diameter, burning rate), two test result spreadsheets, a calibration sample, the FLEX "DoD" document and the FLEX Test Plan (Science Documents) | 274 |
| **BASS-II** — Burning and Suppression of Solids II (PMMA rods, films and sheets, fabrics, a candle) | PSI-25 | [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) | Experiment table, Test Matrices (free-text notes, from which outcomes were extracted by AI and labelled), fan calibration, ReadMe and Science Requirements Document | 129 |

All 403 tests were run in **microgravity on the International Space Station**. PSI has no partial-gravity combustion data,
so the project makes no claims about lunar or Martian gravity.

NASA technical reports used only to define reference atmospheres (not as data): NASA/TM-20220000524 (Moon to Mars
Habitation Considerations, 2022, p.14), NTRS 20240010692 (Evolution to Sustainable Lunar Habitation, 2024, p.12) and
NTRS 20150021491 (Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere, 2015, p.4; NASA/TM-2013-217377
is also listed as a source but was not read). The lunar-habitat, Exploration-Atmosphere and spacesuit scenarios are shown in
the site as "Unverified source" until a team member confirms the citations.

The project is not endorsed by NASA and uses no NASA logos or branding.
