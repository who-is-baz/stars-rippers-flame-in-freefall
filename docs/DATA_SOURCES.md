# Data sources

## NASA data
All test data come from **NASA Physical Sciences Informatics (PSI)**, https://psi.nasa.gov, licence **CC0-1.0**.
The published files were downloaded once, kept unchanged (verified by SHA-256 with `scripts/fetch_psi.py`) and every
table and number was built from them by the scripts in `scripts/`.

| Investigation | PSI ID | DOI | What was used | Tests |
|---|---|---|---|---|
| **FLEX**, Flame Extinguishment Experiment (fuel droplets: heptane, methanol) | PSI-69 | [10.60555/mbq8-0451](https://doi.org/10.60555/mbq8-0451) | Experiment table (O₂, N₂, CO₂, He mole fractions, pressure, outcome, extinction diameter, burning rate), two test-result spreadsheets, a calibration sample, Science Documents (DoD document, Test Plan) | 274 |
| **BASS-II**, Burning and Suppression of Solids II (PMMA rods, films and sheets, fabrics, a candle) | PSI-25 | [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) | Experiment table, Test Matrices (free-text notes; outcomes and air speed extracted by AI and labelled), fan calibration, ReadMe and Science Requirements Document | 129 |

All 403 tests were run in **microgravity on the International Space Station**. PSI has no partial-gravity combustion
data, so the site makes no claims about lunar or Martian gravity.

## Challenge text
The official challenge statement, *Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data*
(NASA Space Apps Challenge 2026), is kept in [`08-reto-oficial.md`](08-reto-oficial.md). It is the source of the expected
Moon-base air (30% O₂ or more at 10.2 psi or less), the spacesuit value (100% O₂ at 4.3 psi), the investigations
catalogue and the partial-gravity note (LUCI, FM2).

## Reference atmospheres
| Scenario | Values | Source | Verified by the team |
|---|---|---|---|
| Earth / ISS reference air | 21% O₂, 14.7 psi | Sea-level air and ISS cabin; 1 atm = 14.696 psi | Yes |
| Expected Moon-base air | ≥30% O₂, ≤10.2 psi | Official challenge text | Yes |
| NASA lunar surface habitat | 26.5% O₂, 10.2 psi | NASA/TM-20220000524 *Moon to Mars Habitation Considerations* (2022) p.14; NTRS 20240010692 (2024) p.12 | No: shown as "Unverified source" |
| NASA Exploration Atmosphere | 34% O₂, 8.2 psi | NTRS 20150021491 *Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere* (2015) p.4 | No: shown as "Unverified source" |
| Spacesuit | 100% O₂, 4.3 psi | Official challenge text; other sources give 85% O₂ at 4.3 psia (NTRS 20220015741) | No: shown as "Unverified source" |

## Other references
- Link, Huang, Fernandez-Pello, Olson and Ferkul (2018). The Effect of Gravity on Flame Spread over PMMA Cylinders.
  *Scientific Reports* 8:120. DOI [10.1038/s41598-017-18398-4](https://doi.org/10.1038/s41598-017-18398-4). One context figure.
- No space agency partner data were used. Software and fonts with their licences: [`THIRD_PARTY.md`](../THIRD_PARTY.md).

The project is not endorsed by NASA and uses no NASA logos or branding.
