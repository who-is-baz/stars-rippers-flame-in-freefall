-- Example queries over data/processed/psi.sqlite
-- Run: python3 scripts/run_sql_examples.py   (or: sqlite3 data/processed/psi.sqlite < docs/sql_examples.sql)
-- Views: v_flex (FLEX, observed outcome) and v_bass2 (BASS-II, outcome extracted by AI or not stated).

-- Q1. FLEX methanol without suppressant: extinction % by O2 level and pressure
SELECT ROUND(pressure_atm, 1)                                          AS p_atm,
       ROUND(o2_fraction, 2)                                           AS x_o2,
       COUNT(*)                                                        AS n,
       SUM(outcome = 'extinction')                                     AS n_ext,
       ROUND(100.0 * SUM(outcome = 'extinction') / COUNT(*), 0)        AS pct_ext
FROM v_flex
WHERE material_or_fuel = 'methanol' AND co2_fraction = 0 AND he_fraction = 0 AND pressure_atm IS NOT NULL
GROUP BY p_atm, x_o2
ORDER BY p_atm, x_o2;

-- Q2. CO2 effect (FLEX, ~1 atm, no He): outcome and K by fuel and CO2 level
SELECT material_or_fuel                                                AS fuel,
       ROUND(co2_fraction, 2)                                          AS x_co2,
       COUNT(*)                                                        AS n,
       ROUND(100.0 * SUM(outcome = 'extinction') / COUNT(*), 0)        AS pct_ext,
       ROUND(AVG(o2_fraction), 3)                                      AS avg_x_o2,
       ROUND(AVG(burning_rate_mm2_s), 3)                               AS avg_k_mm2_s
FROM v_flex
WHERE he_fraction = 0 AND pressure_atm BETWEEN 0.9 AND 1.1
GROUP BY fuel, x_co2
ORDER BY fuel, x_co2;

-- Q3. He effect (FLEX, all pressures): outcome and K by fuel and He level
SELECT material_or_fuel                                                AS fuel,
       ROUND(he_fraction, 2)                                           AS x_he,
       ROUND(pressure_atm, 1)                                          AS p_atm,
       COUNT(*)                                                        AS n,
       ROUND(100.0 * SUM(outcome = 'extinction') / COUNT(*), 0)        AS pct_ext,
       ROUND(AVG(o2_fraction), 3)                                      AS avg_x_o2,
       ROUND(AVG(burning_rate_mm2_s), 3)                               AS avg_k_mm2_s
FROM v_flex
WHERE co2_fraction = 0
GROUP BY fuel, x_he > 0, p_atm
HAVING x_he > 0 OR p_atm IN (SELECT DISTINCT ROUND(pressure_atm, 1) FROM v_flex WHERE he_fraction > 0)
ORDER BY fuel, p_atm, x_he;

-- Q4. FLEX: burning-rate constant K (mm²/s) vs O2, by fuel, at ~1 atm and without suppressant
SELECT material_or_fuel                                                AS fuel,
       ROUND(o2_fraction, 2)                                           AS x_o2,
       COUNT(burning_rate_mm2_s)                                       AS n_k,
       ROUND(MIN(burning_rate_mm2_s), 2)                               AS k_min,
       ROUND(AVG(burning_rate_mm2_s), 3)                               AS k_avg,
       ROUND(MAX(burning_rate_mm2_s), 2)                               AS k_max
FROM v_flex
WHERE co2_fraction = 0 AND he_fraction = 0 AND pressure_atm BETWEEN 0.9 AND 1.1
GROUP BY fuel, x_o2
HAVING n_k >= 3
ORDER BY fuel, x_o2;

-- Q5. FLEX: extinction diameter (outcome = extinction only) by fuel and pressure
SELECT material_or_fuel                                                AS fuel,
       ROUND(pressure_atm, 1)                                          AS p_atm,
       COUNT(extinction_diameter_mm)                                   AS n,
       ROUND(AVG(extinction_diameter_mm), 2)                           AS d_ext_avg_mm,
       ROUND(MIN(extinction_diameter_mm), 2)                           AS d_ext_min_mm,
       ROUND(MAX(extinction_diameter_mm), 2)                           AS d_ext_max_mm
FROM v_flex
WHERE outcome = 'extinction'
GROUP BY fuel, p_atm
ORDER BY fuel, p_atm;

-- Q6. BASS-II: outcome by source and O2 band (NOTE: outcome = AI on notes; 'not_stated' ≠ no extinction)
SELECT CASE WHEN o2_fraction < 0.16 THEN 'a) <16%'
            WHEN o2_fraction < 0.18 THEN 'b) 16-18%'
            WHEN o2_fraction < 0.20 THEN 'c) 18-20%'
            ELSE 'd) >=20%' END                                        AS o2_band,
       COUNT(*)                                                        AS n,
       SUM(outcome = 'extinction')                                     AS low_flow_ext,
       SUM(outcome = 'blowoff')                                        AS blowoff,
       SUM(outcome IN ('no_ignition', 'not_sustained'))                AS no_ign_or_not_sustained,
       SUM(outcome_source = 'not_stated')                              AS not_stated
FROM v_bass2
GROUP BY o2_band
ORDER BY o2_band;
