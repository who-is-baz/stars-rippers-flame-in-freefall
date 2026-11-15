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
    expect(screen.getByText('Illustration. Not a combustion simulation.')).toBeInTheDocument();
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
