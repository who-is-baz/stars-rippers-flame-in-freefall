// The star field lives OUTSIDE the scene SVG (compositor layers), stays aligned with it, and is lighter on phones.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StarField } from './StarField';

describe('StarField', () => {
  it('renders HTML layers with SVGs that use the scene viewBox and slice framing', () => {
    const { container } = render(<StarField phone={false} paused={false} />);
    const root = container.querySelector('[data-part="starfield"]')!;
    expect(root.tagName).toBe('DIV');
    const svgs = [...root.querySelectorAll('svg')];
    expect(svgs.length).toBeGreaterThan(5);
    for (const s of svgs) {
      expect(s.getAttribute('viewBox')).toBe('0 0 1600 1000');
      expect(s.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice');
    }
    expect(root.querySelectorAll('.sf-tw').length).toBeGreaterThanOrEqual(5);      // twinkle groups
    expect(root.querySelectorAll('.sf-drift-1, .sf-drift-2, .sf-drift-3').length).toBe(3);
    expect(root.querySelectorAll('.sf-meteor').length).toBe(2);
    expect(root.querySelectorAll('line').length).toBeGreaterThan(20);              // four-point sparkles kept
  });
  it('phone: no shooting stars; hidden tab: paused class', () => {
    const phone = render(<StarField phone paused={false} />).container.querySelector('[data-part="starfield"]')!;
    expect(phone.querySelectorAll('.sf-meteor').length).toBe(0);
    expect(phone.className).toContain('sf-phone');
    const hidden = render(<StarField phone={false} paused />).container.querySelector('[data-part="starfield"]')!;
    expect(hidden.className).toContain('sf-paused');
  });
});
