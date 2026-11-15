import { describe, expect, it } from 'vitest';
import { animationsPaused, getDisplayPrefs, setDisplayPrefs } from './displayPrefs';

describe('display preferences (text size, pause animations)', () => {
  it('defaults to normal text and running animations', () => {
    expect(getDisplayPrefs()).toEqual({ text: 'md', paused: false });
    expect(document.documentElement.dataset.textSize).toBe('md');
  });
  it('applies and remembers the text size', () => {
    setDisplayPrefs({ text: 'lg' });
    expect(document.documentElement.dataset.textSize).toBe('lg');
    expect(window.localStorage.getItem('fif.textSize')).toBe('lg');
    setDisplayPrefs({ text: 'md' });
  });
  it('pauses animations and remembers it', () => {
    setDisplayPrefs({ paused: true });
    expect(document.documentElement.dataset.motion).toBe('paused');
    expect(window.localStorage.getItem('fif.motion')).toBe('paused');
    expect(animationsPaused()).toBe(true);
    setDisplayPrefs({ paused: false });
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });
});
