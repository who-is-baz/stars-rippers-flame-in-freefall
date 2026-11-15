import { createContext, useEffect, useState, type ReactNode } from 'react';
import type {
  AirflowFile, AnswersFile, CoverageFile, ExperimentsFile, GapsFile, InvestigationsFile, MaterialsFile, Meta, ScenariosFile,
} from './types';
import { loadStatic } from './source';

export interface DataBundle {
  meta: Meta; scenarios: ScenariosFile; coverage: CoverageFile; experiments: ExperimentsFile;
  gaps: GapsFile; materials: MaterialsFile; answers: AnswersFile; airflow: AirflowFile;
  investigations: InvestigationsFile;
}
export type DataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DataBundle };

export const DataContext = createContext<DataState>({ status: 'loading' });
export const RetryContext = createContext<() => void>(() => {});

// assertShape mínima: comprueba solo las claves que la UI necesita para no pintar una gráfica en blanco.
// (Se evita zod: no está en la lista de dependencias autorizadas.)
function assertShape(file: string, v: unknown, checks: Record<string, 'array' | 'object' | 'number' | 'string'>) {
  if (typeof v !== 'object' || v === null) throw new Error(`${file}: not an object`);
  const o = v as Record<string, unknown>;
  for (const [key, kind] of Object.entries(checks)) {
    const x = o[key];
    const ok = kind === 'array' ? Array.isArray(x) : kind === 'object' ? typeof x === 'object' && x !== null : typeof x === kind;
    if (!ok) throw new Error(`${file}: missing or invalid "${key}" (expected ${kind})`);
  }
  return v;
}

async function loadAll(): Promise<DataBundle> {
  const [meta, scenarios, coverage, experiments, gaps, materials, answers, airflow, investigations] = await Promise.all([
    loadStatic<Meta>('meta.json'), loadStatic<ScenariosFile>('scenarios.json'),
    loadStatic<CoverageFile>('coverage.json'), loadStatic<ExperimentsFile>('experiments.json'),
    loadStatic<GapsFile>('gaps.json'), loadStatic<MaterialsFile>('materials.json'),
    loadStatic<AnswersFile>('answers.json'), loadStatic<AirflowFile>('airflow.json'),
    loadStatic<InvestigationsFile>('investigations.json'),
  ]);
  assertShape('meta.json', meta, { license: 'string', min_n: 'number', programs: 'array', tolerance: 'object', limitations: 'array' });
  assertShape('scenarios.json', scenarios, { scenarios: 'array' });
  assertShape('coverage.json', coverage, { cells: 'array' });
  assertShape('experiments.json', experiments, { items: 'array', total: 'number' });
  assertShape('gaps.json', gaps, { gaps: 'array' });
  assertShape('materials.json', materials, { materials: 'array' });
  assertShape('answers.json', answers, { answers: 'array' });
  assertShape('airflow.json', airflow, { items: 'array', n_tests: 'number' });
  assertShape('investigations.json', investigations, { investigations: 'array', pillars: 'array', source: 'string', psi_search_base: 'string', earth_applications: 'object' });
  return { meta, scenarios, coverage, experiments, gaps, materials, answers, airflow, investigations };
}

// Loaded once per page: every consumer shares this promise (module-level cache).
let cache: Promise<DataBundle> | null = null;
export const loadDataOnce = (): Promise<DataBundle> => (cache ??= loadAll().catch((e: unknown) => { cache = null; throw e; }));

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setState({ status: 'loading' });
    let alive = true;
    loadDataOnce().then(
      (data) => alive && setState({ status: 'ready', data }),
      (e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => { alive = false; };
  }, [attempt]);
  return (
    <RetryContext.Provider value={() => setAttempt((a) => a + 1)}>
      <DataContext.Provider value={state}>{children}</DataContext.Provider>
    </RetryContext.Provider>
  );
}
