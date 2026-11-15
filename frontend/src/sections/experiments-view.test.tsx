// The Experiments view. Order by relevance, filters, URL hash, detail drawer, dock shortcuts.
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Console } from './Console';
import { ExperimentTable } from './ExperimentTable';
import { renderWithBoard } from '../test/render';

const FORBIDDEN = /\b(safe|safer|unsafe|predict\w*|probabilit\w*|risk|will|would|likely|chance)\b/i;
const strip = (t: string) => t.replace(/Descriptive summary of NASA test records\. Not a safety assessment or a forecast\./g, '');
const rowsText = () => [...document.querySelectorAll('table.data tbody tr:not(.group-row)')].map((tr) => (tr as HTMLElement).innerText ?? tr.textContent ?? '');
const counter = () => document.querySelector('p[aria-live="polite"]')?.textContent ?? '';
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement | HTMLSelectElement;

describe('Experiments view', () => {
  beforeEach(() => { window.localStorage.clear(); window.history.replaceState(null, '', '/'); });

  it('shows "Showing N of 403" and is ordered by relevance to the selected atmosphere (Moon base: 17 near first)', () => {
    renderWithBoard(<ExperimentTable preset={null} />);
    expect(counter()).toMatch(/Showing\s*403\s*of 403 tests/);
    const first = [...document.querySelectorAll('table.data tbody tr')].slice(0, 17);
    expect(first.every((tr) => /Near/.test(tr.textContent ?? ''))).toBe(true);
    expect(screen.getByRole('note').textContent).toMatch(/not a safety ranking/);
    expect(screen.getByRole('note').textContent).toMatch(/max\(\|ΔO₂\|\/tol, \|Δpsi\|\/tol\)/);
    const heads = [...document.querySelectorAll('thead th')].map((h) => h.textContent);
    expect(heads).toEqual(expect.arrayContaining(['Relevance', 'ΔO₂ (pp)', 'Δpsi', 'Record', 'n']));
  });

  it('combined filters update the count: FLEX + complete + relevance "Exact + near"', () => {
    renderWithBoard(<ExperimentTable preset={null} />);
    fireEvent.change(field('Investigation'), { target: { value: 'FLEX' } });
    expect(counter()).toMatch(/Showing\s*274\s*of 403/);
    fireEvent.change(field('Record'), { target: { value: 'complete' } });
    expect(counter()).toMatch(/Showing\s*257\s*of 403/);
    fireEvent.change(field('Relevance to this atmosphere'), { target: { value: 'exact_near' } });
    expect(counter()).toMatch(/Showing\s*16\s*of 403/);                        // Moon base: 17 near, 1 of them is partial (no measured magnitude)
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }));
    expect(counter()).toMatch(/Showing\s*403\s*of 403/);
  });

  it('BASS-II tests: not stated filter gives 103 and keeps the "not stated ≠ no extinction" note', () => {
    renderWithBoard(<ExperimentTable preset={null} />);
    fireEvent.change(field('Declared outcome'), { target: { value: 'not_stated' } });
    expect(counter()).toMatch(/Showing\s*103\s*of 403/);
    expect(document.body.textContent).toMatch(/does not mean the flame did not go out/);
  });

  it('group by investigation adds a header row per investigation', () => {
    renderWithBoard(<ExperimentTable preset={null} />);
    fireEvent.click(screen.getByLabelText(/By investigation/));
    const groups = [...document.querySelectorAll('tr.group-row th')].map((g) => g.textContent ?? '');
    expect(groups[0]).toMatch(/^FLEX · PSI-69 · 274 tests in this view/);
  });

  it('writes the filters to the URL hash and reads them back', () => {
    const a = renderWithBoard(<ExperimentTable preset={null} />);
    fireEvent.change(field('Investigation'), { target: { value: 'BASS-II' } });
    fireEvent.change(field('Search'), { target: { value: 'pmma' } });
    expect(window.location.hash).toBe('#experiments?q=pmma&program=BASS-II');
    a.unmount();
    window.history.replaceState(null, '', '#experiments?program=BASS-II&q=pmma');
    renderWithBoard(<ExperimentTable preset={null} />);
    expect((field('Investigation') as HTMLSelectElement).value).toBe('BASS-II');
    expect((field('Search') as HTMLInputElement).value).toBe('pmma');
  });

  it('opens a detail panel from the keyboard-reachable test ID button; it shows Why relevant and What this test cannot tell us, and closes with Escape', async () => {
    renderWithBoard(<ExperimentTable preset={null} />);
    const first = [...document.querySelectorAll('table.data tbody th[scope="row"] button')][0] as HTMLButtonElement;
    fireEvent.click(first);
    const dlg = await screen.findByRole('dialog', { name: 'Test details' });
    expect(within(dlg).getByRole('region', { name: 'Why relevant' })).toHaveTextContent(/Near|Exact/);
    expect(within(dlg).getByRole('region', { name: 'What this test cannot tell us' })).toHaveTextContent(/microgravity/);
    expect(dlg.textContent).toMatch(/doi:10\.60555/);
    expect(strip(dlg.textContent ?? '')).not.toMatch(FORBIDDEN);
    fireEvent.keyDown(dlg, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Test details' })).toBeNull());
  });

  it('a BASS-II row shows no Δpsi and the "No pressure recorded" class; the table region is keyboard-scrollable', () => {
    renderWithBoard(<ExperimentTable preset={null} />);
    fireEvent.change(field('Investigation'), { target: { value: 'BASS-II' } });
    expect(rowsText()[0]).toMatch(/No pressure recorded/);
    expect(screen.getByRole('region', { name: /Experiments table/ })).toHaveAttribute('tabindex', '0');
  });

  it('all visible text avoids forbidden words (except the required disclaimer)', () => {
    renderWithBoard(<ExperimentTable preset={null} />);
    expect(strip(document.body.textContent ?? '')).not.toMatch(FORBIDDEN);
  });
});

describe('dock and navigation lead to the Experiments view (no duplicated explorer)', () => {
  beforeEach(() => { window.localStorage.clear(); window.history.replaceState(null, '', '/'); });
  it('"Explore tests" and "Investigations" open the view; Investigations groups by investigation', async () => {
    renderWithBoard(<Console preset={null} />);
    expect(screen.queryByLabelText('Quick test explorer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Explore tests' }));
    expect(await screen.findByRole('dialog', { name: 'Experiments' })).toBeInTheDocument();
  });
  // The dock button now opens the investigations catalog first; the grouped table is one click further (same destination as before).
  it('Investigations → catalog → grouped', async () => {
    renderWithBoard(<Console preset={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Investigations' }));
    expect(await screen.findByRole('dialog', { name: 'Investigations & pillars' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Tests grouped by investigation' }));
    expect(await screen.findByRole('dialog', { name: 'Experiments' })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelectorAll('tr.group-row').length).toBeGreaterThan(0));
  });
});
