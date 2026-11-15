import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { CircleSlash, Send, Sparkles, X } from 'lucide-react';
import type { Answer, Citation } from '../data/types';
import { useAnswers, useMeta } from '../data/useData';
import { hrefFor } from '../app/routes';
import { ASSISTANT_MAX_WIDTH, ASSISTANT_MIN_WIDTH, useAssistant, type AssistantLevel } from '../providers';
import { SourceChip, Warn } from '../components/kit';
import { answerLow } from './lowMode';
import u from '../components/ui.module.css';
import s from './AssistantPanel.module.css';

type Msg = { id: number; q: string; a: Answer | null };

function CitationRow({ c }: { c: Citation }) {
  const meta = useMeta();
  const program = meta.programs.find((p) => p.source_doi === c.source_doi)?.program;
  return (
    <li className={s.cite}>
      <SourceChip doi={c.source_doi} />
      <span className={u.dim}>{c.query}</span>
      {c.test_ids.length > 0 && (
        <a href={hrefFor('explorer', { ...(program ? { program } : {}), ids: c.test_ids.join(',') })}>Show {c.test_ids.length} tests</a>
      )}
    </li>
  );
}

function AnswerView({ a }: { a: Answer }) {
  return (
    <div className={a.no_data ? s.noData : s.answer}>
      {a.no_data && <p className={s.ndHead}><CircleSlash size={14} aria-hidden="true" /> No data available</p>}
      <p>{a.answer}</p>
      {(a.warnings ?? []).map((w) => <Warn key={w}>{w}</Warn>)}
      {a.citations.length > 0 && <ul className={s.cites} aria-label="Sources">{a.citations.map((c, i) => <CitationRow key={i} c={c} />)}</ul>}
    </div>
  );
}

const LEVELS: { id: AssistantLevel; label: string }[] = [
  { id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' },
];

export function AssistantPanel() {
  const { open, setOpen, width, setWidth, level, setLevel } = useAssistant();
  const file = useAnswers();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs]);
  if (!open) return null;

  const ask = (q: string) => {
    const r = answerLow(q, file);
    setMsgs((m) => [...m, { id: Date.now(), q, a: r.kind === 'answer' ? r.answer : null }]);
    setText('');
  };
  const submit = (e: FormEvent) => { e.preventDefault(); if (text.trim()) ask(text.trim()); };

  // Redimensionar: arrastre con puntero o flechas del teclado (separador accesible).
  const onDrag = (e: PointerEvent<HTMLDivElement>) => {
    const startX = e.clientX, startW = width;
    const move = (ev: globalThis.PointerEvent) => setWidth(startW + (startX - ev.clientX));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') setWidth(width + 20);
    if (e.key === 'ArrowRight') setWidth(width - 20);
  };

  return (
    <aside className={s.panel} style={{ width }} aria-labelledby="si-title" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <div className={s.handle} role="separator" aria-orientation="vertical" aria-label="Resize SI assistant panel"
        aria-valuemin={ASSISTANT_MIN_WIDTH} aria-valuemax={ASSISTANT_MAX_WIDTH} aria-valuenow={width} tabIndex={0}
        onPointerDown={onDrag} onKeyDown={onKey} />
      <header className={s.head}>
        <h2 id="si-title"><Sparkles size={16} strokeWidth={1.5} aria-hidden="true" /> SI assistant</h2>
        <button type="button" className={s.close} onClick={() => setOpen(false)} aria-label="Close SI assistant"><X size={16} /></button>
      </header>
      <p className={u.dim}>SI (super intelligence) here means an AI/LLM assistant that only answers from these NASA data. Every answer cites its source.</p>
      <div role="radiogroup" aria-label="Answer level" className={s.levels}>
        {LEVELS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={level === l.id} className={u.choice} aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>{l.label}</button>
        ))}
      </div>
      {level === 'low' ? (
        <p className={u.dim}>Low: quick answers prepared from the data files. No AI model runs; works offline.</p>
      ) : (
        <Warn>{`${level === 'medium' ? 'Medium' : 'High'} needs the local SI model (Ollama) through the team backend, which this public page cannot reach. Answers below use Low.`}</Warn>
      )}
      <div className={s.log} aria-live="polite">
        {msgs.length === 0 && <p className={u.read}>Ask about the data, or try a suggested question.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={s.turn}>
            <p className={s.q}>{m.q}</p>
            {m.a ? <AnswerView a={m.a} /> : <p className={u.read}>No quick answer for that. Try one of the suggested questions below.</p>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <details className={s.sugg} open={msgs.length === 0}>
        <summary className={u.dim}>Suggested questions</summary>
        <div className={s.suggList}>
          {file.answers.map((a) => a.question && (
            <button key={a.id} type="button" className={s.suggBtn} onClick={() => ask(a.question!)}>{a.question}</button>
          ))}
        </div>
      </details>
      <form className={s.form} onSubmit={submit}>
        <label htmlFor="si-q" className="sr-only">Ask about the data</label>
        <input ref={inputRef} id="si-q" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about the data…" autoComplete="off" />
        <button type="submit" className={u.btnMint} aria-label="Ask"><Send size={14} aria-hidden="true" /></button>
      </form>
    </aside>
  );
}
