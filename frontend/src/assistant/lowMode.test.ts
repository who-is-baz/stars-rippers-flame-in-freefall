import { describe, expect, it } from 'vitest';
import answers from '../../public/data/answers.json';
import type { AnswersFile } from '../data/types';
import { answerLow } from './lowMode';

const file = answers as unknown as AnswersFile;
const id = (q: string) => { const r = answerLow(q, file); return r.kind === 'answer' ? r.answer.id ?? 'live' : 'none'; };

describe('lowMode', () => {
  it('gravedad lunar → q10 (no_data), no la respuesta de Moon base', () => expect(id('What happens to fire in lunar gravity?')).toBe('q10'));
  it('Moon base → q03', () => expect(id('Is there data for a Moon base?')).toBe('q03'));
  it('"today" → sin datos en vivo', () => {
    const r = answerLow("What is today's oxygen on the ISS?", file);
    expect(r.kind === 'answer' && r.answer.no_data).toBe(true);
  });
  it('sin coincidencia → none', () => expect(id('xyz')).toBe('none'));
});
