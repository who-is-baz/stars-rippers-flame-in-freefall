import { describe, expect, it } from 'vitest';
import { flagLabel, isNoExtinction, isSmallN, needsAiBadge, outcomeLabel } from './honesty';

describe('honesty', () => {
  it('n < min_n is a small sample', () => {
    expect(isSmallN(4, 5)).toBe(true);
    expect(isSmallN(5, 5)).toBe(false);
  });
  it('not_stated never counts as "no extinction"', () => {
    expect(isNoExtinction({ outcome: null, outcome_source: 'not_stated' })).toBe(false);
    expect(isNoExtinction({ outcome: 'blowoff', outcome_source: 'ai_extracted' })).toBe(true);
    expect(isNoExtinction({ outcome: 'extinction', outcome_source: 'observed' })).toBe(false);
    expect(outcomeLabel(null)).toBe('Not stated in notes');
  });
  it('an unknown flag shows its raw code', () => {
    expect(flagLabel('algo_nuevo')).toBe('algo_nuevo');
    expect(flagLabel('duplicate_flex_id')).toBe('Duplicate test ID in source');
  });
  it('AI-extracted values carry a badge', () => {
    expect(needsAiBadge({ outcome_source: 'ai_extracted', qc_flags: [] })).toBe(true);
    expect(needsAiBadge({ outcome_source: 'observed', qc_flags: [] })).toBe(false);
  });
});
