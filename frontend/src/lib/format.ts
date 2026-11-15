// Unit formatting. It only formats: it computes no new statistics.
const ATM_PSI = 14.696; // 1 atm = 14.696 psi

const trim = (x: number, d: number) => x.toFixed(d).replace(/\.0+$/, '');

export const fmtO2 = (f: number | null): string => (f == null ? 'Not recorded' : `${trim(f * 100, 1)}% O₂`);

// psi first: 0.7057 atm → "10.4 psi (0.71 atm)". No pressure (BASS-II) → "Not recorded".
export const fmtPressure = (atm: number | null): string =>
  atm == null ? 'Not recorded' : `${(atm * ATM_PSI).toFixed(1)} psi (${atm.toFixed(2)} atm)`;
export const fmtPsi = (psi: number): string => `${trim(psi, 1)} psi`;

export const fmtRate = (v: number | null): string => (v == null ? 'No data available' : `${v.toFixed(2)} mm²/s`);
export const fmtDiameter = (v: number | null): string => (v == null ? 'No data available' : `${v.toFixed(2)} mm`);
// Always "descriptive": the FLEX extinction % is not a probability (the JSON carries the note in pct_note).
export const fmtPct = (v: number | null): string => (v == null ? 'No data available' : `${trim(v, 1)}% · descriptive`);
export const fmtGas = (f: number | null, name: 'CO₂' | 'He'): string =>
  f == null ? 'Not recorded' : `${trim(f * 100, 2)}% ${name}`;

export const doiUrl = (doi: string): string => `https://doi.org/${doi}`;

// Scenario criterion in psi, with atm in brackets: 10.2 → "10.2 psi (0.69 atm)".
export const fmtPsiAtm = (psi: number): string => `${trim(psi, 1)} psi (${(psi / ATM_PSI).toFixed(2)} atm)`;
export const fmtRange = (a: string, b: string): string => (a === b ? a : `${a}–${b}`);

// O₂ band label from the JSON → readable text: "0.15-0.18" → "15–18% O₂", ">=0.24" → "≥24% O₂".
export const fmtBand = (band: string): string => {
  const pct = (x: string) => trim(parseFloat(x) * 100, 1);
  if (band.startsWith('>=')) return `≥${pct(band.slice(2))}% O₂`;
  if (band.startsWith('<')) return `<${pct(band.slice(1))}% O₂`;
  const [a, b] = band.split('-');
  return `${pct(a)}–${pct(b)}% O₂`;
};
// O₂ range with a single unit: (0.136, 0.222) → "13.6–22.2% O₂".
export const fmtO2Range = (a: number, b: number): string =>
  a === b ? fmtO2(a) : `${trim(a * 100, 1)}–${trim(b * 100, 1)}% O₂`;
