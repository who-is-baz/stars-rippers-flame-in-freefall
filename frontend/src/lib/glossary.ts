// Glosario de flame-data-viz §6: texto Explorer (cualquiera) / Engineer (técnico).
import type { ExplainMode } from '../providers';

export type Term = 'microgravity' | 'o2' | 'burning_rate' | 'extinction_diameter' | 'disruption' | 'blowoff' | 'psi' | 'tolerance';
const G: Record<Term, { label: string; explorer: string; engineer: string }> = {
  microgravity: { label: 'Microgravity', explorer: "Like falling forever: hot air doesn't rise, so the flame is a ball.", engineer: 'Near-zero buoyancy; diffusion-controlled spherical flame.' },
  o2: { label: 'O₂ fraction', explorer: 'How much of the air is oxygen; Earth ≈21%.', engineer: 'Ambient O₂ mole fraction (FLEX set, BASS-II measured).' },
  burning_rate: { label: 'Burning rate', explorer: 'How fast the fuel drop shrinks.', engineer: 'Burning-rate constant K (d² law), mm²/s.' },
  extinction_diameter: { label: 'Extinction diameter', explorer: 'Drop size when the flame went out.', engineer: 'Droplet diameter at extinction, mm.' },
  disruption: { label: 'Disruption', explorer: "Something interrupted the test; the source doesn't define it.", engineer: 'Not defined in FLEX Science Documents.' },
  blowoff: { label: 'Blowoff', explorer: 'Airflow pushed the flame off.', engineer: 'Flame detachment under forced flow (BASS-II).' },
  psi: { label: 'psi', explorer: 'Air pressure; Earth 14.7 psi.', engineer: 'psia; 1 atm = 14.696 psi.' },
  tolerance: { label: 'Within tolerance', explorer: 'Close enough to count: no test hits a target value exactly.', engineer: 'Match window from meta.tolerance (O₂ fraction and psi), applied by build_frontend_data.py.' },
};
export const glossary = (t: Term, mode: ExplainMode) => ({ label: G[t].label, text: G[t][mode] });
