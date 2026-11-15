// Modo Low: sin LLM. Enruta la pregunta por palabras clave a una respuesta precalculada de answers.json.
// El asistente no genera texto ni cifras: solo elige entre respuestas ya construidas desde los datos.
import type { Answer, AnswersFile } from '../data/types';

const RULES: { re: RegExp; id: string | 'live' }[] = [
  { re: /\b(today|now|latest|live|real[- ]?time|current)\b/i, id: 'live' },
  { re: /(gravity|partial|mars)/i, id: 'q10' },
  { re: /(exploration|8\.2)/i, id: 'q04' },
  { re: /(suit|eva|4\.3)/i, id: 'q05' },
  { re: /(moon|lunar|habitat)/i, id: 'q03' },
  { re: /disrupt/i, id: 'q07' },
  { re: /(co2|co₂|helium|\bhe\b|suppress|put out|extinguish)/i, id: 'q08' },
  { re: /(heptane|methanol|faster|burn(ing)? rate|fuel)/i, id: 'q06' },
  { re: /(material|pmma|fabric|bass|solid|nomex|cotton)/i, id: 'q09' },
  { re: /(earth|iss|cabin|sea level|14\.7)/i, id: 'q02' },
  { re: /(how many|cover|experiments|dataset|tests)/i, id: 'q01' },
];

// Frase fija del contrato de flame-dashboard-builder §5 (no contiene cifras).
const LIVE: Answer = {
  answer: 'These are archived ISS experiments; there is no live data.', citations: [], no_data: true, level: 'low',
};

export type LowResult = { kind: 'answer'; answer: Answer } | { kind: 'none' };

export function answerLow(question: string, file: AnswersFile): LowResult {
  const rule = RULES.find((r) => r.re.test(question));
  if (!rule) return { kind: 'none' };
  if (rule.id === 'live') return { kind: 'answer', answer: { ...LIVE, question } };
  const a = file.answers.find((x) => x.id === rule.id);
  return a ? { kind: 'answer', answer: a } : { kind: 'none' };
}
