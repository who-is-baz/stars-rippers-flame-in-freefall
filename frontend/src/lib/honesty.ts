// Las reglas de honestidad de los datos hechas código. El texto viene de aquí, nunca escrito a mano en componentes.
import type { ExperimentRow, Outcome } from '../data/types';

// n<5 siempre con advertencia; el umbral sale de meta.min_n.
export const isSmallN = (n: number, minN: number): boolean => n < minN;
export const smallNLabel = (n: number): string => `Small sample (n = ${n})`;

const OUTCOMES: Record<Outcome, string> = {
  extinction: 'Extinction', disruption: 'Disruption', completion: 'Completion',
  blowoff: 'Blowoff', no_ignition: 'No ignition', not_sustained: 'Not sustained',
};
export const DISRUPTION_NOTE = 'Not defined in the FLEX Science Documents';

// En BASS-II outcome=null + outcome_source=not_stated significa "el texto no lo dice", NO "no se extinguió".
export const outcomeLabel = (outcome: Outcome | null): string =>
  outcome == null ? 'Not stated in notes' : OUTCOMES[outcome];

// not_stated jamás cuenta como "sin extinción": solo una extinción observada/extraída cuenta, y lo demás es "desconocido".
export const isNoExtinction = (row: Pick<ExperimentRow, 'outcome' | 'outcome_source'>): boolean =>
  row.outcome_source !== 'not_stated' && row.outcome != null && row.outcome !== 'extinction';

const FLAGS: Record<string, string> = {
  extinction_diameter_dropped_outcome_not_extinction: 'Extinction diameter removed: outcome was not extinction',
  co_initial_negative: 'Initial CO reading below zero (kept as recorded)',
  material_assumed_from_readme: 'Material inferred from dataset README',
  mole_fractions_do_not_sum_to_1: 'Gas fractions do not add up to 100%',
  o2_final_implausibly_low: 'Final O₂ reading looks implausible',
  o2_final_implausibly_high: 'Final O₂ reading looks implausible',
  co_over_range_gt_1000ppm: 'CO above sensor range (>1000 ppm)',
  co_final_censored: 'Final CO is a lower bound (>500 ppm); not imputed',
  low_confidence: 'Low-confidence AI extraction',
  material_text_typo: 'Typo in source material text',
  date_year_inconsistent_with_gmt: 'Date year disagrees with GMT day (likely year typo)',
  duplicate_flex_id: 'Duplicate test ID in source',
  burn_time_approx: 'Burn time approximate',
  fer_corrected: 'Value corrected by team data reviewer (original text kept)',
  pressure_zero_set_null: 'Pressure of 0 treated as not recorded',
};
// Flag desconocido → se muestra el código crudo (no se inventa una traducción).
export const flagLabel = (flag: string): string => FLAGS[flag] ?? flag;

// Lo extraído por IA lleva insignia hasta revisión humana.
export const needsAiBadge = (row: Pick<ExperimentRow, 'outcome_source' | 'qc_flags'>): boolean =>
  row.outcome_source === 'ai_extracted' || row.qc_flags.includes('low_confidence');

// Fixed texts (docs/API.md and the data honesty rules). Components import these; they never retype them.
export const LOW_CONFIDENCE_WARNING =
  'includes low-confidence AI-extracted outcomes (pending human review); show them with a warning';
export const hasLowConfidence = (flags: string[]): boolean => flags.includes('low_confidence');
export const DISRUPTION_SHORT = 'not defined by the source';
export const DESCRIPTIVE_ONLY = 'mixed pressures/suppressants: descriptive only';
export const CONFOUND_NOTE =
  'CO₂ and He are confounded with O₂ in these tests (average O₂ differs between suppressant levels). Do not attribute a difference to a single factor.';
export const NOT_STATED_NOTE = '"Not stated" means the source notes do not say. It does not mean the flame did not go out.';
export const MICROGRAVITY_NOTE = 'All tests are microgravity tests on the ISS. No partial-gravity data in PSI.';
