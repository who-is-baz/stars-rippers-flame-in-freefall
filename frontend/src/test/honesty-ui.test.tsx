// The five honesty checks required by the brief, run against the real data files.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { CoverageMap } from '../sections/CoverageMap';
import { ScenarioExplorer } from '../sections/ScenarioExplorer';
import { Materials } from '../sections/Materials';
import { Console } from '../sections/Console';
import { DataCharts } from '../sections/DataCharts';
import { PRESETS, STARTER, STORAGE_KEY, sanitize, useBoardState } from '../state/board';
import { Sidebar } from '../assistant/Sidebar';
import { FALLBACK_NOTICE, OUT_OF_SCOPE } from '../assistant/engine';
import { data, renderWithBoard, renderWithData } from './render';

describe('coverage map', () => {
  it('paints a cell with n < 5 grey and shows a warning', () => {
    renderWithData(<CoverageMap />);
    // heptane, 15–18% O₂, ~0.7 atm has n = 4 in coverage.json
    const cell = screen.getByRole('button', { name: /15–18% O₂, ~0\.7 atm: n = 4, warning/ });
    expect(cell).toHaveClass('cell-small');
    expect(cell).toHaveTextContent('⚠ n < 5');
    fireEvent.click(cell);
    expect(screen.getByText(/n<5: unstable percentage/)).toBeInTheDocument();
    expect(screen.getByText(/descriptive, not a probability/)).toBeInTheDocument();
  });

  it('shows "No data" for an empty cell, never a zero', () => {
    renderWithData(<CoverageMap />);
    const empty = screen.getByRole('button', { name: '<15% O₂, ~0.7 atm: No data' });
    expect(empty).toHaveTextContent('No data');
    expect(empty).not.toHaveTextContent('0');
  });

  it('every cell with data shows its n', () => {
    renderWithData(<CoverageMap />);
    const withData = data.coverage.cells.filter((c) => c.fuel === 'heptane' && c.n > 0);
    for (const c of withData) expect(screen.getAllByText(`n = ${c.n}`).length).toBeGreaterThan(0);
  });
});

describe('scenario explorer', () => {
  it('labels a scenario with verified:false as "Unverified source"', () => {
    renderWithData(<ScenarioExplorer />);
    const unverified = data.scenarios.scenarios.filter((s) => !s.verified);
    expect(unverified.length).toBeGreaterThan(0);
    for (const s of unverified) {
      const card = screen.getByRole('button', { name: new RegExp(s.label.replace(/[()]/g, '\\$&')) });
      expect(within(card).getByText('Unverified source')).toBeInTheDocument();
    }
    const verified = screen.getByRole('button', { name: /Earth \/ ISS reference air/ });
    expect(within(verified).queryByText('Unverified source')).toBeNull();
  });

  it('lunar case shows 0 exact and 17 near separately, and never calls the tests lunar', () => {
    renderWithData(<ScenarioExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /Expected Moon-base air/ }));
    const detail = screen.getByTestId('scenario-lunar_challenge');
    const exact = within(detail).getByText('Exact match').parentElement as HTMLElement;
    const near = within(detail).getByText('Near match').parentElement as HTMLElement;
    expect(exact).not.toBe(near);
    expect(within(exact).getByText('0')).toBeInTheDocument();
    expect(within(near).getByText('17')).toBeInTheDocument();
    expect(detail.textContent).not.toMatch(/lunar tests|moon tests|tests on the moon/i);
    expect(within(detail).getByText(/they are not tests of this scenario/)).toBeInTheDocument();
  });
});

describe('BASS-II materials', () => {
  it('never presents a BASS-II figure as a percentage of extinction', () => {
    renderWithData(<Materials />);
    const section = screen.getByTestId('materials');
    expect(section.textContent).not.toContain('%'); // no percentage of any kind in this section
    expect(section.textContent).toMatch(/does not mean the flame did not go out/);
    expect(screen.getByText(/26 of 129/)).toBeInTheDocument();
    expect(screen.getAllByText(/low-confidence AI-extracted outcomes/).length).toBeGreaterThan(0);
  });
});

describe('assistant sidebar', () => {
  const ask = (q: string) => {
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: q } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  };

  it('falls back to Basic when the endpoint fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl="http://127.0.0.1:9" fetchImpl={fetchImpl} />);
    fireEvent.click(screen.getByRole('button', { name: 'Heavy' }));
    ask('Is there data for a Moon base?');
    await waitFor(() => expect(screen.getByText(FALLBACK_NOTICE)).toBeInTheDocument());
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(screen.getByText(/None exactly \(0\)/)).toBeInTheDocument();      // the precomputed answer q03
    expect(screen.getByText(/Basic · fixed answer/)).toBeInTheDocument();
    expect(screen.queryByText('AI-generated text')).toBeNull();
  });

  it('falls back to Basic when the endpoint takes too long', async () => {
    const fetchImpl = ((_: unknown, init?: RequestInit) => new Promise((_res, rej) => {
      init?.signal?.addEventListener('abort', () => rej(new Error('aborted')));
    })) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl="http://127.0.0.1:9" fetchImpl={fetchImpl} timeoutMs={20} />);
    fireEvent.click(screen.getByRole('button', { name: 'Flash' }));
    ask('What does disruption mean?');
    await waitFor(() => expect(screen.getByText(FALLBACK_NOTICE)).toBeInTheDocument());
  });

  it('without VITE_LLM_URL only Basic is enabled', () => {
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} />);
    for (const name of ['Flash', 'Medium', 'Heavy']) expect(screen.getByRole('button', { name })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Basic' })).toBeEnabled();
    expect(screen.getByText(/Local AI — runs on the demo machine/)).toBeInTheDocument();
  });

  it('answers out-of-scope questions with the fixed sentence', async () => {
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} />);
    ask('Who won the football match?');
    await waitFor(() => expect(screen.getByText(OUT_OF_SCOPE)).toBeInTheDocument());
  });
});

describe('single-screen console & saved board', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts with the Starter board: honesty legend, match card (0 exact, 17 near), inspector and interpretation', () => {
    renderWithBoard(<Console preset={null} />);
    expect(screen.getByText('Illustration. Not a combustion simulation.')).toBeInTheDocument();
    const match = screen.getByRole('article', { name: 'How many tests match this air?' });
    expect(within(match).getAllByText(/0 exact matches/).length).toBeGreaterThan(0);
    expect(match).toHaveTextContent('17');
    expect(screen.getByRole('article', { name: 'What air are we looking at?' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'What do these tests tell us?' })).toBeInTheDocument();
  });

  it('switching atmosphere in the dock updates the cards', () => {
    renderWithBoard(<Console preset={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Earth \/ ISS/ }));
    expect(screen.getAllByText(/49 tests/).length).toBeGreaterThan(0);
  });

  it('the Engineer preset marks n < 5 and shows BASS-II counts with no percentage', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESETS.find((p) => p.id === 'engineer')!.board));
    renderWithBoard(<Console preset={null} />);
    expect(screen.getByText(/2 points with n < 5/)).toBeInTheDocument();
    const mat = screen.getByRole('article', { name: 'Which solid materials were tested?' });
    expect(mat.textContent).not.toContain('%');
    expect(mat).toHaveTextContent(/26 of 129 with outcome/);
  });

  it('removing a card from its menu is saved and survives a reload', () => {
    const first = renderWithBoard(<Console preset={null} />);
    const gaps = screen.getByRole('article', { name: 'What do these tests tell us?' });
    fireEvent.click(within(gaps).getByRole('button', { name: 'Card options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Remove/ }));
    expect(screen.queryByRole('article', { name: 'What do these tests tell us?' })).toBeNull();
    first.unmount();
    renderWithBoard(<Console preset={null} />);
    expect(screen.queryByRole('article', { name: 'What do these tests tell us?' })).toBeNull();
  });

  it('a card can open its full view over the console', async () => {
    renderWithBoard(<Console preset={null} />);
    const gaps = screen.getByRole('article', { name: 'What do these tests tell us?' });
    fireEvent.click(within(gaps).getByRole('button', { name: 'Open full view' }));
    expect(screen.getByRole('dialog', { name: 'Experiment table' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to console/ }));
    // closing plays a short exit animation before the panel unmounts
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Experiment table' })).toBeNull());
  });
});

describe('board storage', () => {
  it('drops unknown cards, duplicates and anything over the slot limit', () => {
    const b = sanitize({
      left: ['gaps', 'gaps', 'nope', 'kpi', 'materials', 'coverage'],
      right: ['outcomes', 'burning_rate', 'scenario_inspector'],
      collapsed: ['gaps', 'ghost'],
      addedBy: { gaps: 'si', ghost: 'si', kpi: 'hacker' },
    });
    expect(b.left).toEqual(['gaps', 'kpi', 'materials']);
    expect(b.right).toEqual(['outcomes', 'burning_rate']);
    expect(b.collapsed).toEqual(['gaps']);
    expect(b.addedBy).toEqual({ gaps: 'si' });
  });

  it('applies several quick actions in the same tick without losing any', () => {
    window.localStorage.clear();
    const { result } = renderHook(() => useBoardState());
    act(() => { result.current.remove('scenario_match'); result.current.remove('burning_rate'); result.current.remove('interpretation'); });
    expect(result.current.board.left).toEqual([]);
    act(() => { result.current.add('burning_rate'); result.current.add('materials'); });
    expect(result.current.board.left).toEqual(['burning_rate', 'materials']);
    act(() => { result.current.undo(); });
    expect(result.current.board.left).toEqual(['burning_rate']);
  });

  it('falls back to Starter for junk', () => {
    expect(sanitize('garbage')).toEqual(STARTER);
    expect(sanitize(null)).toEqual(STARTER);
  });
});

describe('data charts', () => {
  it('the pie shows real counts and never a percentage', () => {
    renderWithData(<DataCharts />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Pie' })[0]);
    const pie = screen.getByRole('img', { name: /Extinction 186.*n = 274/ });
    const card = pie.closest('article') as HTMLElement;
    expect(card.textContent).not.toContain('%');
    expect(card).toHaveTextContent(/Counts, not probabilities/);
    expect(card).toHaveTextContent(/not defined by the source/);
  });

  it('the oxygen-band bars count every FLEX test exactly once', () => {
    renderWithData(<DataCharts />);
    const bars = screen.getByRole('img', { name: /FLEX tests per oxygen band/ });
    const counts = [...(bars.getAttribute('aria-label') ?? '').matchAll(/(?:heptane|methanol) (\d+)/g)].map((m) => Number(m[1]));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(274);
  });

  it('the scatter has one dot per FLEX test with a recorded burning rate, and no trend line', () => {
    renderWithData(<DataCharts />);
    const sc = screen.getByRole('img', { name: /Scatter of 258 FLEX tests/ });
    expect(sc.querySelectorAll('circle.dot')).toHaveLength(258);
    expect(sc.querySelector('polyline, path')).toBeNull();
  });
});
