// Custom atmosphere explorer: retrieval of observed tests, rendered states, honesty wording and accessibility.
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Console } from './Console';
import { Sidebar } from '../assistant/Sidebar';
import { DISCLAIMER } from './AtmosphereExplorer';
import { globalRateScale, glowFor, matchTests } from '../lib/explorer';
import type { ExperimentRow, Fuel } from '../data/types';
import { data, renderWithBoard, renderWithData } from '../test/render';

const rows = data.experiments.items as ExperimentRow[];
const scale = globalRateScale(rows);

// Real settings found in experiments.json for each state (see docs/screenshots/README.md).
export const STATES = {
  stable: { fuel: 'any', o2: 0.34, psi: 10.3 },     // 9 tests, 0 extinction
  mixed: { fuel: 'any', o2: 0.2, psi: 14.6 },       // 56 tests, 34 extinction
  out: { fuel: 'methanol', o2: 0.14, psi: 14.6 },   // 25 of 25 extinction
  small_n: { fuel: 'any', o2: 0.15, psi: 10.3 },    // n = 4
  empty: { fuel: 'any', o2: 0.27, psi: 20 },        // no test within tolerance
} as const;
const FUEL_LABEL = { any: 'Both', heptane: 'Heptane', methanol: 'Methanol' } as const;

function openCustom() {
  renderWithBoard(<Console preset={null} />);
  fireEvent.click(screen.getByRole('button', { name: /^Custom/ }));
  return screen.getByRole('region', { name: 'Custom atmosphere explorer' });
}
function setState(panel: HTMLElement, s: { fuel: Fuel | 'any'; o2: number; psi: number }) {
  fireEvent.click(within(within(panel).getByRole('group', { name: 'Fuel' })).getByRole('button', { name: FUEL_LABEL[s.fuel] }));
  fireEvent.change(within(panel).getByLabelText('Oxygen (O₂)'), { target: { value: String(s.o2) } });
  fireEvent.change(within(panel).getByLabelText('Pressure'), { target: { value: String(s.psi) } });
}
const flame = () => document.querySelector('[data-obs-state]') as SVGGElement | null;
const BANNED = /\b(predict\w*|forecast\w*|probabilit\w*|chance|likely|safe|safer|safest|will)\b/i;

describe('custom atmosphere explorer', () => {
  beforeEach(() => window.localStorage.clear());

  it('controls have accessible labels and keyboard-operable inputs', () => {
    const panel = openCustom();
    const o2 = within(panel).getByLabelText('Oxygen (O₂)');
    expect(o2).toHaveAttribute('type', 'range');
    expect(o2.getAttribute('aria-valuetext')).toMatch(/matching tests/);
    expect(within(panel).getByLabelText('Pressure')).toHaveAttribute('type', 'range');
    expect(within(panel).getByRole('group', { name: 'Fuel' })).toBeInTheDocument();
    expect(within(panel).getByRole('group', { name: /Suppressant/ })).toBeInTheDocument();
    expect(within(panel).getByLabelText('Snap to tested conditions')).toHaveAttribute('type', 'checkbox');
    expect(panel.querySelector('[aria-live="polite"]')?.textContent).toMatch(/tests within|No test within tolerance/);
    expect(within(panel).getByText(/Solid materials \(BASS-II\) are not part of this explorer/)).toBeInTheDocument();
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByText('Illustration. Not a combustion simulation.')).toBeInTheDocument();
  });

  it('slider ranges come from the FLEX data', () => {
    const panel = openCustom();
    const flex = rows.filter((r) => r.program === 'FLEX' && r.pressure_atm != null);
    const o2 = within(panel).getByLabelText('Oxygen (O₂)');
    expect(Number(o2.getAttribute('min'))).toBe(Math.min(...flex.map((r) => r.o2_fraction)));
    expect(Number(o2.getAttribute('max'))).toBe(Math.max(...flex.map((r) => r.o2_fraction)));
  });

  it('Earth/ISS preset by default: 49 tests, the same count as scenarios.json', async () => {
    const panel = openCustom();
    await waitFor(() => expect(within(panel).getByText(/preset: Earth \/ ISS reference air \(49 exact, 49 near\)/)).toBeInTheDocument());
    expect(within(panel).getByText(/of 49 tests ended in extinction/, { selector: 'b' })).toBeInTheDocument();
  });

  it('lunar challenge preset keeps ≥/≤ criteria: 0 exact, 17 near', async () => {
    const panel = openCustom();
    fireEvent.click(within(within(panel).getByRole('group', { name: 'Atmosphere presets' })).getByRole('button', { name: /Expected Moon-base air/ }));
    await waitFor(() => expect(within(panel).getByText(/\(0 exact, 17 near\)/, { selector: '.ax-big' })).toBeInTheDocument());
    expect(within(panel).getAllByText('Unverified source').length).toBe(data.scenarios.scenarios.filter((s) => !s.verified).length);
  });

  for (const [name, s] of Object.entries(STATES)) {
    it(`state ${name}: rendered text never predicts or rates safety`, async () => {
      const panel = openCustom();
      setState(panel, s);
      await waitFor(() => expect(flame()?.getAttribute('data-obs-state')).toBe(name));
      const text = (document.body.textContent ?? '').replace(DISCLAIMER, '');
      expect(text).not.toMatch(BANNED);
    });
  }

  it('n < 5: grey, warned, and no extinguished state even when all 4 ended in extinction', async () => {
    const panel = openCustom();
    setState(panel, STATES.small_n);
    await waitFor(() => expect(flame()?.getAttribute('data-obs-state')).toBe('small_n'));
    expect(within(panel).getAllByText(/n < 5/).length).toBeGreaterThan(0);
    expect(document.querySelector('.obs-out')).toBeNull();
    expect(document.querySelector('.obs-flicker')).toBeNull();
    expect(within(panel).getByText('4 of 4 tests ended in extinction', { selector: 'b' })).toBeInTheDocument();
  });

  it('0 matches: hatch, no burning or extinction figures, up to 3 nearest buttons that give that n', async () => {
    const panel = openCustom();
    setState(panel, STATES.empty);
    await waitFor(() => expect(flame()?.getAttribute('data-obs-state')).toBe('empty'));
    expect(within(panel).queryByText(/mm²\/s/)).toBeNull();
    expect(within(panel).queryByText(/ended in extinction/)).toBeNull();
    expect(screen.getAllByText(/No test within tolerance/).length).toBeGreaterThan(0);
    const nearest = within(panel).getAllByRole('button', { name: /n = \d+/ });
    expect(nearest.length).toBeGreaterThan(0);
    expect(nearest.length).toBeLessThanOrEqual(3);
    const n = Number(/n = (\d+)/.exec(nearest[0].textContent ?? '')![1]);
    fireEvent.click(nearest[0]);
    await waitFor(() => expect(within(panel).getByText(String(n), { selector: '.ax-big b' })).toBeInTheDocument());
  });

  it('mixed suppressants: confounding note with n per suppressant', async () => {
    const panel = openCustom();
    setState(panel, STATES.mixed);
    await waitFor(() => expect(within(panel).getByText(/CO₂ and He are confounded with O₂/)).toBeInTheDocument());
    expect(within(panel).getByText(/n by suppressant: none \d+ · CO₂ \d+ · He \d+/)).toBeInTheDocument();
    expect(within(panel).getByLabelText('not defined by the source')).toBeInTheDocument(); // disruption tooltip
  });

  it('brightness uses the fixed global scale: same rate → same scale, whatever the selection', async () => {
    const panel = openCustom();
    for (const s of [STATES.mixed, STATES.out, STATES.stable]) {
      setState(panel, s);
      const m = matchTests(rows, { fuel: s.fuel, suppressant: 'any', o2: { kind: 'point', value: s.o2 }, pressure_psi: { kind: 'point', value: s.psi } }, data.meta.tolerance);
      const expected = Number((0.8 + 0.6 * (glowFor(m.meanRate, scale) as number)).toFixed(3));
      await waitFor(() => expect(Number(flame()?.getAttribute('data-obs-scale'))).toBe(expected));
    }
  });

  it('all extinguished with n ≥ 5 → static extinguished state; 0 < k < n → flicker (CSS, off with reduced motion)', async () => {
    const panel = openCustom();
    setState(panel, STATES.out);
    await waitFor(() => expect(document.querySelector('.obs-out')).not.toBeNull());
    setState(panel, STATES.mixed);
    await waitFor(() => expect(document.querySelector('.obs-flicker')).not.toBeNull());
    expect(within(panel).getByText(/Mixed outcomes/, { selector: '.ax-state' })).toBeInTheDocument();
  });
});

describe('ask about these settings', () => {
  it('pre-fills the question without sending it', () => {
    let calls = 0;
    const fetchImpl = (async () => { calls += 1; return new Response('{}'); }) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} fetchImpl={fetchImpl}
      draft={{ token: 1, question: 'What did FLEX tests observe for heptane at 21% O₂ · 14.7 psi (1.00 atm), any suppressant?' }} />);
    expect(screen.getByLabelText('Your question')).toHaveValue('What did FLEX tests observe for heptane at 21% O₂ · 14.7 psi (1.00 atm), any suppressant?');
    expect(screen.queryByRole('article', { name: 'Answer' })).toBeNull();
    expect(calls).toBe(0);
  });
});
