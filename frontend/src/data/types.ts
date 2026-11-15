// Copiado de flame-react-frontend §4 (verificado contra los JSON del 14 nov). No renombrar campos.
export type Program = 'FLEX' | 'BASS-II';
export type Fuel = 'heptane' | 'methanol';
export type Outcome =
  | 'extinction' | 'disruption' | 'completion'
  | 'blowoff' | 'no_ignition' | 'not_sustained';
export type OutcomeSource = 'observed' | 'ai_extracted' | 'not_stated';
export type CellStatus = 'ok' | 'no data';
export type O2Band = '<0.15' | '0.15-0.18' | '0.18-0.21' | '0.21-0.24' | '>=0.24';
export type PressureLevel = '~0.7 atm' | '~1.0 atm' | '>2 atm';

export interface ProgramMeta { program: Program; psi_id: string; n: number; source_doi: string; what: string }
export interface Meta {
  title: string; generated_utc: string; license: string; n_tests: number;
  programs: ProgramMeta[]; source_doi: string[];
  tolerance: { o2_fraction: number; pressure_psi: number };
  o2_bands: { label: O2Band; min_inclusive: number; max_exclusive: number }[];
  pressure_levels: { label: PressureLevel; atm_min: number; atm_max: number | null }[];
  min_n: number;
  excluded_from_pressure_views: { test_id: string; program: Program; reason: string }[];
  limitations: string[];
}

export interface ExperimentRow {
  program: Program; test_id: string; date: string;
  material_or_fuel: string; material_category: string;
  o2_fraction: number; pressure_atm: number | null;
  co2_fraction: number | null; he_fraction: number | null;
  outcome: Outcome | null; outcome_source: OutcomeSource;
  extinction_diameter_mm: number | null; burning_rate_mm2_s: number | null;
  qc_flags: string[]; source_doi: string;
  low_confidence_warning?: string;
}
export interface ExperimentsFile { columns: string[]; total: number; items: ExperimentRow[] }

export interface CoverageCell {
  fuel: Fuel; o2_band: O2Band; pressure_level: PressureLevel;
  n: number; status: CellStatus;
  n_by_suppressant: { none: number; co2: number; he: number };
  n_burning_rate: number; avg_burning_rate_mm2_s: number | null;
  n_extinction: number; n_extinction_diameter: number; avg_extinction_diameter_mm: number | null;
  pct_extinction: number | null; pct_note: string | null; warning: string | null;
  qc_flags: string[]; source_doi: string[];
}
export interface CoverageFile {
  program: 'FLEX'; note: string; n_tests: number;
  n_cells: number; n_cells_empty: number; n_cells_small: number; cells: CoverageCell[];
}

export interface ScenarioMatch {          // `exact` puede venir como { n: 0 } sin más campos
  n: number; o2_min?: number; o2_max?: number; atm_min?: number; atm_max?: number;
  psi_min?: number; psi_max?: number;
  n_by_fuel?: Partial<Record<Fuel, number>>; n_by_outcome?: Partial<Record<Outcome, number>>;
  test_ids?: string[];
}
export interface NearestMatch extends ScenarioMatch {
  pressure_level: PressureLevel; distance_in_tolerances: number; note: string; // "it is NOT this scenario"
}
type Criterion = { kind: 'point' | 'min' | 'max'; value: number };
export interface Scenario {
  id: 'earth_iss' | 'lunar_challenge' | 'lunar_nasa' | 'exploration' | 'suit';
  label: string;
  criteria: { o2: Criterion; pressure_psi: Criterion; tolerance: Meta['tolerance'] };
  n_exact: number; n_near: number; status: CellStatus;
  exact: ScenarioMatch; near: ScenarioMatch; nearest: NearestMatch | null;
  bass2_o2_only?: { n: number; note: string };
  source: string; quote: string | null; verified: boolean; note: string | null;
  excluded: { test_id: string; reason: string }[]; source_doi: string;
}
export interface ScenariosFile { program: 'FLEX'; tolerance: Meta['tolerance']; scenarios: Scenario[] }

export interface Gap { id: string; text: string; source_doi: string[]; evidence: Record<string, unknown> }
export interface GapsFile { gaps: Gap[] }

export type MaterialClass = 'flammable_demonstrated' | 'undetermined';
export interface MaterialGroup {
  n: number; n_with_outcome: number; n_not_stated: number;
  n_by_outcome: Partial<Record<Outcome, number>>; n_low_confidence: number;
  o2_min: number; o2_max: number; classification: MaterialClass;
  warning: string | null; qc_flags: string[]; test_ids: string[];
}
export interface Material extends MaterialGroup {
  material_category: string;
  by_color?: (MaterialGroup & { color: string })[];
}
export interface MaterialsFile {
  program: 'BASS-II'; source_doi: string; n_tests: number;
  classification_rule: Record<string, string>; non_flammable: string[]; notes: string[]; materials: Material[];
}

export interface Citation { query: string; params: Record<string, unknown>; source_doi: string; test_ids: string[] }
export interface Answer {
  id?: string; question?: string; answer: string; citations: Citation[];
  no_data: boolean; warnings?: string[]; level: 'low' | 'medium' | 'high'; tool_calls?: unknown[];
}
export interface AnswersFile { level: 'low'; note: string; answers: Answer[] }
