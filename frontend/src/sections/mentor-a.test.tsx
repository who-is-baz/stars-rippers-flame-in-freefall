// Indicators strip + scenario interpretation card. Numbers come from the data files.
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Console } from './Console';
import { Sources } from './Sources';
import { invDef } from './IndicatorsStrip';
import { data, renderWithBoard, renderWithData } from '../test/render';
import { DISCLAIMER_INTERPRETATION } from '../lib/interpretation';

const strip = () => screen.getByRole('region', { name: 'Dataset indicators' });
const card = () => screen.getByRole('article', { name: 'What do these tests tell us?' });
const pickScenario = (re: RegExp) => fireEvent.click(within(screen.getByRole('group', { name: 'Choose an atmosphere' })).getByRole('button', { name: re }));
const FORBIDDEN = /\b(safe|safer|unsafe|predict\w*|probabilit\w*|risk|will|would|likely|chance)\b/i;

describe('indicators strip', () => {
  beforeEach(() => window.localStorage.clear());
  it('shows Tests, Investigations, Complete, Partial, coverage and without-evidence, each with its denominator', () => {
    renderWithBoard(<Console preset={null} />);
    const t = strip().textContent ?? '';
    expect(t).toMatch(/Tests403/);
    expect(t).toMatch(new RegExp(`Investigations${data.meta.programs.length} of ${data.investigations.investigations.length}`));
    expect(t).toMatch(/Investigations2 of 20/);
    expect(t).toMatch(/Complete283 of 403/);
    expect(t).toMatch(/Partial120 of 403/);
    expect(t).toMatch(/26 AI-extracted/);
    expect(t).toMatch(/Scenario coverage\d+ of 9 groups \(\d+%\)/);
    expect(t).toMatch(/Without evidence10 of 30 grid cells/);
    expect(t).toMatch(/\d+ of 6 here/);
  });
  it('every indicator has a definition tooltip, and none uses safety or forecast words', () => {
    renderWithBoard(<Console preset={null} />);
    const defs = [...strip().querySelectorAll('dl > div')].map((d) => d.getAttribute('title') ?? '');
    expect(defs).toHaveLength(6);
    for (const d of defs) { expect(d.length).toBeGreaterThan(30); expect(d).not.toMatch(FORBIDDEN); }
    expect(defs.join(' ')).toMatch(/not a safety score/);
  });
  it('Investigations: "2 of 20" read from meta.json and investigations.json, explained in the tooltip and the button label', () => {
    renderWithBoard(<Console preset={null} />);
    const expected = '2 of the 20 investigations named in the challenge text have test-level data here: FLEX (PSI-69) and BASS-II (PSI-25).';
    expect(invDef(data.meta.programs, data.investigations.investigations.length)).toBe(expected);
    expect(invDef([data.meta.programs[0]], 7)).toBe('1 of the 7 investigations named in the challenge text have test-level data here: FLEX (PSI-69).');
    const box = [...strip().querySelectorAll('dl > div')].find((d) => d.querySelector('dt')?.textContent === 'Investigations')!;
    expect(box.getAttribute('title')).toContain(expected);
    const btn = within(box as HTMLElement).getByRole('button');
    expect(btn.getAttribute('aria-label')).toContain(expected);
    expect(btn.textContent).toBe('2 of 20');
    expect(`${box.getAttribute('title')} ${btn.getAttribute('aria-label')}`).not.toMatch(FORBIDDEN);
  });
  it('coverage follows the selected scenario and the without-evidence count follows too', () => {
    renderWithBoard(<Console preset={null} />);
    pickScenario(/Earth \/ ISS/);
    const earth = strip().textContent ?? '';
    pickScenario(/Spacesuit/);
    const suit = strip().textContent ?? '';
    expect(suit).not.toBe(earth);
    expect(suit).toMatch(/6 of 6 here/);                     // no FLEX test near 100 % O₂ at 4.3 psi
  });
  it('has no horizontal overflow source: it wraps (flex-wrap)', () => {
    renderWithBoard(<Console preset={null} />);
    expect(strip().querySelector('dl')?.className).toContain('ind-list');
  });
});

describe('interpretation card', () => {
  beforeEach(() => window.localStorage.clear());
  it('Moon base: useful evidence (3 tests), what they show (with n) and what remains unresolved, plus the disclaimer', () => {
    renderWithBoard(<Console preset={null} />);
    pickScenario(/Moon base/);
    const c = card();
    expect(within(c).getByRole('region', { name: 'Useful evidence' }).querySelectorAll('ol li')).toHaveLength(3);
    expect(within(c).getByRole('region', { name: 'What the nearest tests show' })).toHaveTextContent(/of 17 .* ended in extinction \(descriptive; n = 17\)/);
    const un = within(c).getByRole('region', { name: 'What remains unresolved' });
    expect(un).toHaveTextContent(/No exact tests/);
    expect(c).toHaveTextContent(DISCLAIMER_INTERPRETATION);
    expect(c.textContent?.replace(DISCLAIMER_INTERPRETATION, '')).not.toMatch(FORBIDDEN);
  });
  it('Spacesuit (0 exact, 0 near): "No matching tests", closest tested conditions, no extinction figure', () => {
    renderWithBoard(<Console preset={null} />);
    pickScenario(/Spacesuit/);
    const c = card();
    expect(within(c).getAllByText('No matching tests.').length).toBeGreaterThan(0);
    expect(c.textContent).toMatch(/Closest tested: .* \(not this atmosphere\)/);
    expect(c.textContent).not.toMatch(/ended in extinction/);
    expect(c).toHaveTextContent(/unverified/i);
  });
  it('the unresolved list can be expanded and links go to Gaps or Methods', () => {
    renderWithBoard(<Console preset={null} />);
    const un = within(card()).getByRole('region', { name: 'What remains unresolved' });
    const before = un.querySelectorAll('li').length;
    fireEvent.click(within(card()).getByRole('button', { name: /\+\d+ more/ }));
    expect(un.querySelectorAll('li').length).toBeGreaterThan(before);
    expect(within(un).getAllByRole('button', { name: /^(Gaps|Methods)$/ }).length).toBeGreaterThan(0);
  });
  it('Custom replaces the atmosphere: the card and strip talk about the custom settings', () => {
    renderWithBoard(<Console preset={null} />);
    fireEvent.click(screen.getByRole('button', { name: /^Custom Observed tests/ }));
    expect(card()).toBeInTheDocument();
    expect(strip().textContent).toMatch(/\d+ of 9 groups/);
  });
});

describe('Methods & Sources states the definitions', () => {
  it('complete/partial, scenario coverage and conditions without evidence', () => {
    renderWithData(<Sources />);
    const t = document.body.textContent ?? '';
    expect(t).toMatch(/Complete/); expect(t).toMatch(/Partial/);
    expect(t).toMatch(/Scenario coverage/); expect(t).toMatch(/Conditions without evidence/);
    expect(t).toMatch(/max\(\|ΔO₂\|/);
    expect(t).toMatch(/not a safety ranking/i);
    expect(data.meta.tolerance.o2_fraction).toBe(0.01);
  });
});
