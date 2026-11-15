// Fixed camera: no drag-to-rotate, no wheel zoom, no zoom buttons, no rotation hint.
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FlameScene } from './FlameScene';
import { data } from '../test/render';
import type { Scenario } from '../data/types';

const scenario = data.scenarios.scenarios[0] as unknown as Scenario;

describe('FlameScene camera', () => {
  it('has no zoom buttons and no "drag to rotate · scroll to zoom" text; keeps the illustration notice', () => {
    render(<FlameScene scenario={scenario} />);
    expect(screen.queryByRole('button', { name: /zoom in|zoom out|reset view/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/drag to rotate|scroll to zoom/i);
    expect(screen.getByText('Conceptual illustration. Not a physical simulation or a prediction.')).toBeInTheDocument();
  });
  it('does not capture the wheel (the page keeps scrolling) and a drag changes nothing', () => {
    render(<FlameScene scenario={scenario} />);
    const svg = document.querySelector('#scene') as SVGSVGElement;
    const world = svg.querySelector('g') as SVGGElement;
    const before = world.getAttribute('transform');
    const wheel = new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true });
    svg.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    fireEvent.pointerDown(svg, { clientX: 10, clientY: 10 }); fireEvent.pointerMove(svg, { clientX: 200, clientY: 50 }); fireEvent.pointerUp(svg);
    expect(world.getAttribute('transform')).toBe(before);
  });
  it('keeps the Chamber / Flame / Droplet view buttons', () => {
    render(<FlameScene scenario={scenario} />);
    for (const n of ['Chamber', 'Flame', 'Droplet']) expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
  });
});

// ---- illustrative flames (Part C): match stick, oxygen particles, 1 g reference, reduced motion
import { afterEach, vi } from 'vitest';
import { REF_1G_NOTE, NO_TESTS_NOTE } from './FlameArt';

const byId = (id: string) => data.scenarios.scenarios.find((s) => s.id === id) as unknown as Scenario;
const count = () => Number(document.querySelector('[data-particles]')?.getAttribute('data-count'));

describe('FlameScene illustrations', () => {
  afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('draws the match stick in Chamber and Flame views but not in Droplet', () => {
    render(<FlameScene scenario={byId('earth_iss')} />);
    expect(document.querySelector('[data-part="match-stick"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Droplet' }));
    expect(document.querySelector('[data-part="match-stick"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Flame' }));
    expect(document.querySelector('[data-part="match-stick"]')).not.toBeNull();
  });

  it('microgravity is the default: round flame, particles that drift in from all sides, no 1 g flame', () => {
    render(<FlameScene scenario={byId('earth_iss')} />);
    expect(document.querySelector('[data-flame="micro"]')).not.toBeNull();
    expect(document.querySelector('[data-flame="1g"]')).toBeNull();
    expect(document.querySelector('[data-particles="diffusion"]')).not.toBeNull();
  });

  it('more oxygen draws more particles (Earth 21 % vs spacesuit 100 %)', () => {
    const a = render(<FlameScene scenario={byId('earth_iss')} />); const n21 = count(); a.unmount();
    render(<FlameScene scenario={byId('suit')} />);
    expect(count()).toBeGreaterThan(n21);
  });

  it('a scenario with 0 exact and 0 near tests dims the flame and says "No matching tests — illustration only"', () => {
    const a = render(<FlameScene scenario={byId('suit')} />);
    expect(document.querySelector('[data-note="no-tests"]')?.textContent).toBe(NO_TESTS_NOTE);
    a.unmount();
    render(<FlameScene scenario={byId('earth_iss')} />);
    expect(document.querySelector('[data-note="no-tests"]')).toBeNull();
    expect(document.body.textContent).not.toContain(NO_TESTS_NOTE);
  });

  it('1 g comparison: obligatory sentence, rising air, and nothing from the data attached', () => {
    render(<FlameScene scenario={byId('earth_iss')} />);
    const btn = screen.getByRole('button', { name: 'Earth 1 g (illustration)' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(REF_1G_NOTE)).toBeNull();
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(REF_1G_NOTE).toBe('Reference only. This dataset has no 1 g or partial-gravity tests.');
    expect(screen.getByText(REF_1G_NOTE)).toBeInTheDocument();
    expect(document.querySelector('[data-flame="1g"]')).not.toBeNull();
    expect(document.querySelector('[data-particles="rising"]')).not.toBeNull();
    const sceneText = document.querySelector('#scene')?.textContent ?? '';
    expect(sceneText).toContain('Earth 1 g (illustration)');
    expect(sceneText).not.toMatch(/21\s*%|14\.7|psi|mm²|tests?\b/i);   // no figures from the data, not even the scenario's
    fireEvent.click(btn);                                              // back to microgravity
    expect(document.querySelector('[data-flame="micro"]')).not.toBeNull();
  });

  it('prefers-reduced-motion: particles are static and the 1 g flame does not animate', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: /reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {} }));
    render(<FlameScene scenario={byId('exploration')} />);
    const ps = [...document.querySelectorAll('.o2p')];
    expect(ps.length).toBeGreaterThan(0);
    expect(ps.every((p) => p.classList.contains('o2p-static'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Earth 1 g (illustration)' }));
    expect(document.querySelector('.flame-1g')).toBeNull();
    expect(document.querySelector('[data-flame="1g"]')).not.toBeNull();
  });

  it('with motion allowed the particles animate', () => {
    render(<FlameScene scenario={byId('earth_iss')} />);
    expect([...document.querySelectorAll('.o2p')].every((p) => !p.classList.contains('o2p-static'))).toBe(true);
  });

  it('phones get fewer particles', () => {
    const a = render(<FlameScene scenario={byId('earth_iss')} />); const desktop = count(); a.unmount();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: /max-width: 640px/.test(q), media: q, addEventListener() {}, removeEventListener() {} }));
    render(<FlameScene scenario={byId('earth_iss')} />);
    expect(count()).toBeLessThan(desktop);
  });
});
