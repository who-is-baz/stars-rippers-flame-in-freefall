// Investigations catalog: only the official challenge text for the rows we did not process (no figures),
// counts for FLEX / BASS-II taken from meta.json, transparent order, pillar filter, dock and indicator entry points.
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import file from '../../public/data/investigations.json';
import meta from '../../public/data/meta.json';
import type { Investigation, InvestigationsFile, Meta } from '../data/types';
import { ORDER_NOTE, STATUS_LABEL, orderInvestigations, pillarSummary, programOf, psiSearchUrl } from '../lib/investigations';
import { CATALOG, MAX_PER_SIDE, PRESETS } from '../state/board';
import { BoardCard } from '../components/Cards';
import { Console } from './Console';
import { Investigations } from './Investigations';
import { IndicatorsStrip } from './IndicatorsStrip';
import { renderWithBoard } from '../test/render';

const inv = file as unknown as InvestigationsFile;
const m = meta as unknown as Meta;
const rows = inv.investigations;
const CHALLENGE = 'NASA Space Apps challenge text';

describe('investigations.json (catalog from the challenge text only)', () => {
  it('every row and every pillar names its source', () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.source).toBe(CHALLENGE);
    for (const p of inv.pillars) expect(p.source).toBe(CHALLENGE);
    expect(inv.earth_applications.source).toBe(CHALLENGE);
  });

  it('rows without processed data carry no figures: no numeric fields and no digits in their descriptive text', () => {
    const unprocessed = rows.filter((r) => r.status !== 'processed');
    expect(unprocessed.length).toBeGreaterThan(0);
    for (const r of unprocessed) {
      expect(r.program).toBeUndefined();
      expect(Object.values(r).some((v) => typeof v === 'number')).toBe(false);
      for (const text of [r.pillar, r.fuel, r.hardware, r.status, r.note]) expect(text).not.toMatch(/\d/);
      expect(JSON.stringify(r)).not.toMatch(/PSI-\d|10\.\d{4,}\//); // no PSI id and no DOI we have not verified
    }
  });

  it('the file itself stores no test counts, PSI ids or DOIs (they come from meta.json)', () => {
    const text = JSON.stringify(inv);
    expect(text).not.toMatch(/PSI-\d/);
    expect(text).not.toMatch(/10\.60555/);
    for (const r of rows) expect(Object.values(r).some((v) => typeof v === 'number')).toBe(false);
  });

  it('only FLEX and BASS-II are marked as processed, and their counts match meta.json', () => {
    const processed = rows.filter((r) => r.status === 'processed');
    expect(processed.map((r) => r.program).sort()).toEqual(['BASS-II', 'FLEX']);
    for (const r of processed) {
      const pm = programOf(r, m)!;
      expect(pm.n).toBe(m.programs.find((p) => p.program === r.program)!.n);
      expect(pm.source_doi).toBe(m.programs.find((p) => p.program === r.program)!.source_doi);
    }
    expect(processed.reduce((s, r) => s + programOf(r, m)!.n, 0)).toBe(m.n_tests);
  });

  it('pillar summary: Prevention → BASS-II, Suppression → FLEX, Detection → 0 processed here (counts from meta.json)', () => {
    const by = Object.fromEntries(pillarSummary(inv, m).map((p) => [p.id, p]));
    const n = (program: string) => m.programs.find((p) => p.program === program)!.n;
    expect(by.prevention.processed).toEqual([expect.objectContaining({ name: 'BASS-II', n: n('BASS-II') })]);
    expect(by.suppression.processed).toEqual([expect.objectContaining({ name: 'FLEX', n: n('FLEX') })]);
    expect(by.detection.nProcessed).toBe(0);
    expect(by.detection.names).toEqual(['SAME', 'SAME-R']);
  });

  it('names the investigations of the challenge text, with LUCI and FM2 as future', () => {
    const names = rows.map((r) => r.name);
    for (const x of ['BASS', 'BASS-II', 'Saffire-I', 'Saffire-II', 'Saffire-III', 'SAME', 'SAME-R', 'FLEX', 'FLEX-2', 'CFI', 'ACME', 'BRE', 'CFI-G', 'E-FIELD Flames', 'SPICE', 'SLICE', 'DAFT', 'DAFT-2', 'LUCI', 'FM2']) expect(names).toContain(x);
    expect(rows.filter((r) => r.status === 'future').map((r) => r.name).sort()).toEqual(['FM2', 'LUCI']);
  });

  it('order: test-level data here first, then pillar, then A–Z', () => {
    const o = orderInvestigations(rows);
    expect(o.slice(0, 2).map((r) => r.name)).toEqual(['BASS-II', 'FLEX']);
    const rest = o.slice(2);
    const rank: Record<Investigation['pillar'], number> = { prevention: 0, detection: 1, suppression: 2, 'not stated': 3 };
    for (let i = 1; i < rest.length; i++) {
      const a = rest[i - 1], b = rest[i];
      expect(rank[a.pillar] < rank[b.pillar] || (rank[a.pillar] === rank[b.pillar] && a.name.localeCompare(b.name, 'en') <= 0)).toBe(true);
    }
  });

  it('PSI links are searches by name, never an invented PSI id', () => {
    expect(psiSearchUrl(inv.psi_search_base, 'E-FIELD Flames')).toBe('https://psi.nasa.gov/physci/repo/search?q=E-FIELD%20Flames');
  });
});

describe('Investigations view and card', () => {
  beforeEach(() => { window.localStorage.clear(); window.history.replaceState(null, '', '/'); });

  it('shows the three pillars with counts from meta.json and the transparent-order sentence', () => {
    renderWithBoard(<Investigations />);
    const n = (program: string) => m.programs.find((p) => p.program === program)!.n;
    expect(screen.getByRole('listitem', { name: 'Prevention' })).toHaveTextContent(`BASS-II ${n('BASS-II')} tests processed`);
    expect(screen.getByRole('listitem', { name: 'Suppression' })).toHaveTextContent(`FLEX ${n('FLEX')} tests processed`);
    expect(screen.getByRole('listitem', { name: 'Detection' })).toHaveTextContent('0 processed here (SAME / SAME-R exist in PSI)');
    expect(screen.getByText(ORDER_NOTE)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/from the challenge text/);
  });

  it('unprocessed rows show a PSI search link and no figures; processed rows show their DOI', () => {
    renderWithBoard(<Investigations />);
    const trs = [...document.querySelectorAll('table.inv-table tbody tr')] as HTMLElement[];
    expect(trs.length).toBe(rows.length);
    const same = trs.find((tr) => tr.querySelector('th b')?.textContent === 'SAME')!;
    expect(same.textContent).toContain(STATUS_LABEL.in_psi);
    expect(within(same).getByRole('link', { name: 'Search PSI for SAME' })).toHaveAttribute('href', 'https://psi.nasa.gov/physci/repo/search?q=SAME');
    expect(same.textContent).not.toMatch(/\d/);
    const flex = trs.find((tr) => tr.querySelector('th b')?.textContent === 'FLEX')!;
    expect(flex.textContent).toContain(`${m.programs.find((p) => p.program === 'FLEX')!.n} tests`);
    expect(flex.textContent).toContain('doi:10.60555/mbq8-0451');
    const luci = trs.find((tr) => tr.querySelector('th b')?.textContent === 'LUCI')!;
    expect(luci.textContent).toContain(STATUS_LABEL.future);
    expect(within(luci).queryByRole('link')).toBeNull();
  });

  it('the pillar chips filter the table', () => {
    renderWithBoard(<Investigations />);
    fireEvent.click(screen.getByRole('button', { name: 'Detection' }));
    const names = [...document.querySelectorAll('table.inv-table tbody th b')].map((b) => b.textContent);
    expect(names).toEqual(['SAME', 'SAME-R']);
  });

  it('is a catalog card with a full view, sits in the Full preset within the slot limits, and renders counts from meta.json', () => {
    const c = CATALOG.find((x) => x.type === 'investigations')!;
    expect(c.view).toBe('investigations');
    const full = PRESETS.find((p) => p.id === 'full')!.board;
    expect([...full.left, ...full.right]).toContain('investigations');
    expect(full.left.length).toBeLessThanOrEqual(MAX_PER_SIDE.left);
    expect(full.right.length).toBeLessThanOrEqual(MAX_PER_SIDE.right);
    renderWithBoard(<BoardCard type="investigations" />);
    const card = screen.getByRole('article', { name: 'Investigations & fire-safety pillars' });
    expect(card).toHaveTextContent(`FLEX · ${m.programs.find((p) => p.program === 'FLEX')!.n} tests processed`);
    expect(card).toHaveTextContent(`BASS-II · ${m.programs.find((p) => p.program === 'BASS-II')!.n} tests processed`);
    expect(card).toHaveTextContent('0 processed here');
    expect(card).toHaveTextContent('not a safety ranking');
  });

  it('the dock button and the Investigations indicator open the catalog', async () => {
    const a = renderWithBoard(<Console preset={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Investigations' }));
    expect(await screen.findByRole('dialog', { name: 'Investigations & pillars' })).toBeInTheDocument();
    a.unmount();
    renderWithBoard(<><IndicatorsStrip /><Console preset={null} /></>);
    fireEvent.click(screen.getAllByRole('button', { name: /open the investigations catalog/ })[0]);
    expect(await screen.findByRole('dialog', { name: 'Investigations & pillars' })).toBeInTheDocument();
  });
});
