// The five honesty checks required by the brief, run against the real data files.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { CoverageMap } from '../sections/CoverageMap';
import { ScenarioExplorer } from '../sections/ScenarioExplorer';
import { Materials } from '../sections/Materials';
import { Sidebar } from '../assistant/Sidebar';
import { FALLBACK_NOTICE, OUT_OF_SCOPE } from '../assistant/engine';
import { data, renderWithData } from './render';

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
    expect(screen.getByText(/Basic · no model/)).toBeInTheDocument();
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
