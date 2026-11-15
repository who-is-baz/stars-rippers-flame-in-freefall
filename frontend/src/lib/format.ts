// Formato de unidades (flame-data-viz §2). Solo da formato: no calcula estadísticas nuevas.
const ATM_PSI = 14.696; // 1 atm = 14.696 psi

const trim = (x: number, d: number) => x.toFixed(d).replace(/\.0+$/, '');

export const fmtO2 = (f: number | null): string => (f == null ? 'Not recorded' : `${trim(f * 100, 1)}% O₂`);

// psi primero: 0.7057 atm → "10.4 psi (0.71 atm)". Sin presión (BASS-II) → "Not recorded".
export const fmtPressure = (atm: number | null): string =>
  atm == null ? 'Not recorded' : `${(atm * ATM_PSI).toFixed(1)} psi (${atm.toFixed(2)} atm)`;
export const fmtPsi = (psi: number): string => `${trim(psi, 1)} psi`;

export const fmtRate = (v: number | null): string => (v == null ? 'No data available' : `${v.toFixed(2)} mm²/s`);
export const fmtDiameter = (v: number | null): string => (v == null ? 'No data available' : `${v.toFixed(2)} mm`);
// Siempre "descriptive": el % de extinción de FLEX no es una probabilidad (la nota la trae el JSON en pct_note).
export const fmtPct = (v: number | null): string => (v == null ? 'No data available' : `${trim(v, 1)}% · descriptive`);
export const fmtGas = (f: number | null, name: 'CO₂' | 'He'): string =>
  f == null ? 'Not recorded' : `${trim(f * 100, 2)}% ${name}`;

export const doiUrl = (doi: string): string => `https://doi.org/${doi}`;
