import { describe, expect, it } from 'vitest';
import { data } from '../test/render';
import { NO_LIVE_DATA, OUT_OF_SCOPE, answerBasic, ask, sanitizeCitations } from './engine';

const idOf = (q: string) => data.answers.answers.find((a) => a.answer === answerBasic(q, data).text)?.id;

describe('assistant engine (Basic)', () => {
  it('lunar gravity → the no-data answer, not the Moon-base answer', () => {
    expect(idOf('What happens to fire in lunar gravity?')).toBe('q10');
    expect(answerBasic('What happens to fire in lunar gravity?', data).noData).toBe(true);
  });
  it('Moon base → q03', () => expect(idOf('Is there data for a Moon base?')).toBe('q03'));
  it('"today" → no live data', () => expect(answerBasic("What is today's oxygen on the ISS?", data).text).toBe(NO_LIVE_DATA));
  it('no match → fixed out-of-scope sentence', () => {
    const r = answerBasic('xyz', data);
    expect(r.text).toBe(OUT_OF_SCOPE);
    expect(r.outOfScope).toBe(true);
  });
  it('test ID → template built from that row, cited with its DOI and ID', () => {
    const r = answerBasic('Tell me about 053F001', data);
    expect(r.text).toContain('FLEX test 053F001');
    expect(r.text).toContain('not defined by the source'); // outcome is disruption
    expect(r.citations).toEqual([{ query: 'experiments', params: {}, source_doi: '10.60555/mbq8-0451', test_ids: ['053F001'] }]);
    expect(r.n).toBe(1);
  });
  it('n counts cited tests from the data', () => expect(answerBasic('Is there data for a Moon base?', data).n).toBe(17));
});

describe('assistant engine (remote)', () => {
  it('drops citations that do not point at data on this page', () => {
    const out = sanitizeCitations([
      { query: 'q1', source_doi: '10.60555/mbq8-0451', test_ids: ['053F001', 'MADE-UP'] },
      { query: 'q1', source_doi: '10.9999/invented', test_ids: [] },
    ], data);
    expect(out).toEqual([{ query: 'q1', params: {}, source_doi: '10.60555/mbq8-0451', test_ids: ['053F001'] }]);
  });
  it('marks model text as AI-generated and maps Heavy → high', async () => {
    let sent = '';
    const fetchImpl = (async (_u: unknown, init?: RequestInit) => {
      sent = String(init?.body);
      return new Response(JSON.stringify({ answer: 'In the tested conditions, we observed X.', citations: [], no_data: false }));
    }) as unknown as typeof fetch;
    const r = await ask('q', 'heavy', data, { url: 'http://x/', fetchImpl });
    expect(JSON.parse(sent)).toEqual({ question: 'q', level: 'high' });
    expect(r.aiText).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/without a verifiable citation/);
  });
  it('HTTP error → Basic', async () => {
    const fetchImpl = (async () => new Response('no', { status: 500 })) as unknown as typeof fetch;
    const r = await ask('xyz', 'medium', data, { url: 'http://x', fetchImpl });
    expect(r.answeredBy).toBe('basic');
    expect(r.notice).toBeDefined();
  });
});
