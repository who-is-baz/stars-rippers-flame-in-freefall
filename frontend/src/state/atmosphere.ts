// The atmosphere the dashboard is currently about: the selected scenario, or the Custom explorer settings when Custom is open.
// Indicators, interpretation and the Experiments view all read it from here, so they always agree.
import { useScenarios } from '../data/useData';
import { useUi } from './ui';
import { useCustom } from './custom';
import type { AtmosphereContext } from '../lib/interpretation';
import type { Scenario } from '../data/types';

export interface ActiveAtmosphere extends AtmosphereContext { source: 'scenario' | 'custom'; scenario: Scenario | null }

export function useActiveAtmosphere(): ActiveAtmosphere | null {
  const { scenarios } = useScenarios();
  const { scenarioId } = useUi();
  const custom = useCustom();
  if (custom.active && custom.summary) {
    const c = custom.summary;
    return { o2: c.o2, pressure_psi: c.pressure_psi, label: `Custom · ${c.atmosphere}`, verified: null, fuel: c.fuelRaw, suppressant: c.suppressantRaw, source: 'custom', scenario: null };
  }
  const s = scenarios.find((x) => x.id === scenarioId) ?? scenarios[0];
  if (!s) return null;
  return { o2: s.criteria.o2, pressure_psi: s.criteria.pressure_psi, label: s.label, verified: s.verified, fuel: 'any', suppressant: 'any', source: 'scenario', scenario: s };
}
