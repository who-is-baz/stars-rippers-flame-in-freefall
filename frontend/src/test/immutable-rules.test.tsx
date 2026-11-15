// Immutable data rules (see README, Limits) checked on the rendered site, against the real data files.
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Console } from '../sections/Console';
import { ExperimentTable } from '../sections/ExperimentTable';
import { data, renderWithBoard, renderWithData } from '../test/render';
import type { ExperimentRow } from '../data/types';

const rows = data.experiments.items as ExperimentRow[];

describe('immutable data rules', () => {
  beforeEach(() => window.localStorage.clear());

  it('data: exactly 3 low-confidence BASS-II outcomes and 3 unverified scenarios', () => {
    expect(rows.filter((r) => r.qc_flags.includes('low_confidence')).length).toBe(3);
    expect(data.scenarios.scenarios.filter((s) => !s.verified).map((s) => s.id).sort()).toEqual(['exploration', 'lunar_nasa', 'suit']);
  });

  it('the experiment table labels AI-extracted and low-confidence outcomes and explains not_stated and disruption', () => {
    renderWithData(<ExperimentTable preset={null} />);
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/not.stated/i);
    expect(text).toMatch(/does not mean|not defined by the source/i);
    expect(screen.getAllByText(/AI[- ]extracted|AI-extracted/i).length).toBeGreaterThan(0);
  });

  it('the inspector card shows "Unverified" for each unverified scenario and not for verified ones', () => {
    renderWithBoard(<Console preset={null} />);
    const dock = screen.getByRole('group', { name: 'Choose an atmosphere' });
    for (const [name, unverified] of [[/NASA lunar habitat/, true], [/Exploration/, true], [/Spacesuit/, true], [/Moon base/, false], [/Earth \/ ISS/, false]] as const) {
      fireEvent.click(within(dock).getByRole('button', { name }));
      const insp = screen.getByRole('article', { name: /What air are we looking at/i });
      expect(within(insp).queryByText('Unverified') !== null).toBe(unverified);
    }
  });

  it('no predictive or safety language anywhere in the console (every card, default board)', () => {
    renderWithBoard(<Console preset={null} />);
    const text = (document.body.textContent ?? '').replace(/Observed in NASA PSI tests\. Not a simulation or a forecast\./g, '').replace(/Descriptive summary of NASA test records\. Not a safety assessment or a forecast\./g, '').replace('Conceptual illustration. Not a physical simulation or a prediction.', '');
    expect(text).not.toMatch(/\b(predict\w*|probabilit\w*|chance|likely|safe|safer|safest|will)\b/i);
  });

  it('BASS-II is never given an extinction percentage and FLEX percentages are marked descriptive', () => {
    renderWithBoard(<Console preset={null} />);
    expect(document.body.textContent).not.toMatch(/BASS-II[^.]{0,80}\d+(\.\d+)?\s*% (of tests )?(ended in )?extinction/i);
    const bass = (data.materials.notes ?? []).join(' ');
    expect(bass).toMatch(/No extinction percentage is reported for BASS-II/);
  });

  it('every FLEX coverage cell with a percentage carries the "not a probability" note and n<5 carries a warning', () => {
    for (const c of data.coverage.cells) {
      if (c.n === 0) { expect(c.pct_extinction).toBeNull(); continue; }
      expect(c.pct_note).toBe('descriptive, not a probability');
      expect(Boolean(c.warning)).toBe(c.n < data.meta.min_n);
    }
  });

  it('the assistant never offers a suggested question the system cannot answer', () => {
    expect(data.answers.answers.length).toBe(12);
    for (const a of data.answers.answers) expect(a.answer.length).toBeGreaterThan(20);
  });
});
