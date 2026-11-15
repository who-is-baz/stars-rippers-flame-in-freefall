// Basic assistant: "most relevant tests" uses the same order as the Experiments view (independent reference: mentor_golden.json).
import { describe, expect, it } from 'vitest';
import golden from '../lib/mentor_golden.json';
import { data } from '../test/render';
import { answerBasic } from './engine';

const FORBIDDEN = /\b(safe|safer|unsafe|predict\w*|probabilit\w*|risk|will|would|likely|chance)\b/i;

describe('assistant: most relevant tests', () => {
  it('a named scenario gets the top 5 in the reference order, cited by code, ending with "not a safety ranking"', () => {
    for (const [q, sid] of [['Which tests are most relevant to the moon base?', 'lunar_challenge'], ['most relevant tests for the earth cabin', 'earth_iss'], ['which tests are most relevant to the spacesuit', 'suit']] as const) {
      const r = answerBasic(q, data);
      expect(r.citations[0].query).toBe('most_relevant_tests');
      expect(r.citations[0].test_ids).toEqual(golden.scenarios[sid].top10.slice(0, 5).map((x) => x.test_id));
      expect(r.text).toMatch(/not a safety ranking/);
      expect(r.text.replace('not a safety ranking', '')).not.toMatch(FORBIDDEN);
      expect(r.noData).toBe(false);
    }
  });
  it('Spacesuit has no exact or near test: says so and calls the list "closest (not this atmosphere)"', () => {
    expect(answerBasic('which tests are most relevant to the suit', data).text).toMatch(/^No test is exact or near Spacesuit.*not this atmosphere/);
  });
  it('the suggested question keeps its precomputed answer; with no scenario named it explains the order', () => {
    const q11 = data.answers.answers.find((a) => a.id === 'q11')!;
    expect(answerBasic(q11.question ?? '', data).text).toBe(q11.answer);
    const r = answerBasic('which tests are most relevant', data);
    expect(r.kind).toBe('about');
    expect(r.text).toMatch(/Exact, then Near, then Not near/);
  });
  it('the two new suggested questions exist and q12 is computed from the data', () => {
    const q12 = data.answers.answers.find((a) => a.id === 'q12')!;
    expect(q12.answer).toMatch(/all 403 tests are microgravity/);
    expect(q12.answer).toMatch(/103 of 129 BASS-II outcomes are not stated/);
    expect(answerBasic(q12.question ?? '', data).text).toBe(q12.answer);
  });
});
