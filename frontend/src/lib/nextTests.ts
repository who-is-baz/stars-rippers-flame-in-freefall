// Headline finding and the "What NASA should test next" list. Pure functions: every figure is read from
// scenarios.json and gaps.json (nothing is typed by hand), so if the data changes the text changes with it.
// It lists conditions with no recorded test. It does not rank hazards and it does not estimate outcomes.
import type { Gap, Scenario } from '../data/types';
import { fmtPsi } from './format';
import { fmtCriterionO2 } from './scenario';

export const CHALLENGE_SOURCE = 'NASA Space Apps challenge text';

const SIGN = { point: '', min: '≥', max: '≤' } as const;
const critPsi = (s: Scenario): string => `${SIGN[s.criteria.pressure_psi.kind]}${fmtPsi(s.criteria.pressure_psi.value)}`;

export interface Finding { scenarioId: Scenario['id']; n_exact: number; n_near: number; atmosphere: string; text: string; source_doi: string }

// The Moon-base scenario of the challenge statement (O₂ ≥ 30 %, ≤ 10.2 psi): how many FLEX tests match it.
export function moonBaseFinding(scenarios: Scenario[]): Finding | null {
  const s = scenarios.find((x) => x.id === 'lunar_challenge');
  if (!s) return null;
  const atmosphere = `${fmtCriterionO2(s)}, ${critPsi(s)}`;
  const exact = `${s.n_exact} exact ${s.n_exact === 1 ? 'test' : 'tests'}`;
  const near = `${s.n_near} near ${s.n_near === 1 ? 'one' : 'ones'}`;
  return {
    scenarioId: s.id, n_exact: s.n_exact, n_near: s.n_near, atmosphere, source_doi: s.source_doi,
    text: `For the planned Moon-base air (${atmosphere}), the NASA PSI FLEX data has ${exact} and ${near}.`,
  };
}

export interface NextTest { id: string; text: string; source_doi: string[]; source: 'gaps.json' | 'scenarios.json' }

// Gaps about test conditions (not about how a field was recorded), in this order.
const CONDITION_GAPS = ['low_pressure', 'oxygen_gap', 'high_oxygen', 'high_pressure_small_n', 'empty_cells'];

export function nextTests(gaps: Gap[], scenarios: Scenario[]): NextTest[] {
  const fromGaps: NextTest[] = CONDITION_GAPS
    .map((id) => gaps.find((g) => g.id === id))
    .filter((g): g is Gap => g != null)
    .map((g) => ({ id: g.id, text: g.text, source_doi: g.source_doi, source: 'gaps.json' }));
  const fromScenarios: NextTest[] = scenarios
    .filter((s) => s.n_exact === 0)
    .map((s) => ({
      id: `scenario_${s.id}`,
      text: `${s.label} (${fmtCriterionO2(s)}, ${critPsi(s)}): ${s.n_exact} exact FLEX tests, ${s.n_near} near.`,
      source_doi: s.source_doi ? [s.source_doi] : [],
      source: 'scenarios.json',
    }));
  return [...fromGaps, ...fromScenarios];
}

// Stated by the official challenge text (docs/08-reto-oficial.md); no dataset DOI applies.
export const PARTIAL_GRAVITY_NOTE =
  'The challenge text states that there is currently no partial-gravity combustion data in PSI; it expects such data to be added in the future, for example from LUCI and FM2.';
