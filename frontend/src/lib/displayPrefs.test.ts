import { describe, expect, it } from 'vitest';
import { animationsPaused, getDisplayPrefs, setDisplayPrefs } from './displayPrefs';

describe('display preferences (text size, pause animations)', () => {
  it('defaults to Dark, normal text, normal contrast and running animations', () => {
    expect(getDisplayPrefs()).toEqual({ text: 'md', paused: false, theme: 'dark', contrast: false });
    expect(document.documentElement.dataset.textSize).toBe('md');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('switches to Light and back, remembered, and Higher contrast is a separate switch', () => {
    setDisplayPrefs({ theme: 'light' });
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('fif.theme')).toBe('light');
    setDisplayPrefs({ contrast: true });
    expect(document.documentElement.dataset.contrast).toBe('more');
    setDisplayPrefs({ theme: 'dark', contrast: false });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.contrast).toBeUndefined();
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
