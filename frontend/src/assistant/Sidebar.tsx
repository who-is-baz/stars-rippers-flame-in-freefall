import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Copy, SendHorizontal, Sparkles, X } from 'lucide-react';
import { useData } from '../data/useData';
import { useUi } from '../state/ui';
import { Badge, Doi, Skeleton, Warn } from '../components/ui';
import { DEFAULT_API_URL, DEFAULT_TAGS, LEVELS, LEVEL_TIER, ask, fetchLlmStatus, type Level, type LlmStatus, type Reply } from './engine';

// Backend base URL (no /api). VITE_LLM_URL wins; VITE_API_URL is accepted as an alias.
const ENV_URL: string | undefined = import.meta.env.VITE_LLM_URL || import.meta.env.VITE_API_URL || undefined;
type Conn = 'idle' | 'connecting' | 'connected' | 'no_api' | 'no_ollama';
const LOCAL_ONLY = 'Local AI — runs on the demo machine';

interface Turn {
  id: number;
  question: string;
  reply: Reply | null;
  error: string | null;
  boardAction?: string | null;
}

const replyAsText = (t: Turn): string => {
  if (!t.reply) return t.question;
  const cites = t.reply.citations.map((c) => `doi:${c.source_doi}${c.test_ids.length ? ` (tests: ${c.test_ids.join(', ')})` : ''}`);
  return [`Q: ${t.question}`, `A: ${t.reply.text}`, ...t.reply.warnings.map((w) => `Warning: ${w}`), ...(cites.length ? [`Sources: ${cites.join('; ')}`] : [])].join('\n');
};

// "<Level> · <model>" only for text a model wrote; "fallback" when its text was replaced by the template; otherwise a fixed answer.
const suffixOf = (r: Reply): string => (r.aiText ? ` · ${r.model ?? 'AI'}` : r.mode === 'fallback' ? ' · fallback' : ' · fixed answer');

function ReplyCard({ turn, onAsk }: { turn: Turn; onAsk: (q: string) => void }) {
  const { showTests } = useUi();
  const [copied, setCopied] = useState(false);
  const r = turn.reply;
  if (turn.error) return <div className="msg-a" role="alert"><Warn>Something went wrong: {turn.error}. Please try again.</Warn></div>;
  if (!r) {
    return (
      <div className="msg-a" role="status" aria-label="Looking up the answer">
        <Skeleton h={12} w="90%" /><Skeleton h={12} w="70%" /><Skeleton h={12} w="40%" />
      </div>
    );
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(replyAsText(turn)); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  };
  return (
    <article className="msg-a" aria-label="Answer">
      <div className="row">
        <Badge>{LEVELS.find((l) => l.value === r.answeredBy)?.label ?? r.answeredBy}{suffixOf(r)}</Badge>
        {r.kind === 'about' && <Badge tone="info" title="Fixed answer about this page; no model and no dataset involved">About this site</Badge>}
        {r.outOfScope && <Badge title="The question is not about the NASA PSI data or this page">Out of scope</Badge>}
        {r.noData && r.kind !== 'about' && !r.outOfScope && <Badge tone="caution">No data</Badge>}
        {r.aiText && <Badge tone="info" title="Text written by a local language model. Check it against the citations.">AI-generated text</Badge>}
      </div>
      {r.notice && <Warn>{r.notice}</Warn>}
      {r.info && <p className="dim" role="note" style={{ fontSize: 'var(--fs-xs)' }}>{r.info}</p>}
      {r.noData && !r.outOfScope && (
        <div className="co-act co-act-no" aria-hidden="true">
          <span>∅ No matching or live data</span>
          <span className="co-ok">no_data</span>
        </div>
      )}
      <p>{r.text}</p>
      {turn.boardAction && (
        <div className="co-act">
          <span style={{ whiteSpace: 'nowrap' }}>⚙ Card:</span>
          <span className="dim">{turn.boardAction}</span>
          <span className="co-ok">✓ Added</span>
        </div>
      )}
      {r.outOfScope && <p className="dim">Try one of the suggested questions, or ask about a test ID, a fuel, an atmosphere or a material.</p>}
      {r.suggestions && r.suggestions.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="label">Try one of these questions</span>
          <div className="suggest" style={{ maxHeight: 'none' }}>
            {r.suggestions.map((q) => <button key={q} type="button" onClick={() => onAsk(q)}>{q}</button>)}
          </div>
        </div>
      )}
      {r.warnings.map((w) => <Warn key={w}>{w}</Warn>)}
      {r.kind === 'about' ? (
        <div className="cites"><span className="label">Section of this page</span><span>{r.section}</span></div>
      ) : r.outOfScope ? null : (
      <div className="cites">
        <span className="label">Citations (from the data files)</span>
        {r.citations.length === 0 ? <span className="dim">None: this answer cites no dataset.</span> : (
          <ul>
            {r.citations.map((c, i) => (
              <li key={`${c.source_doi}-${c.query}-${i}`}>
                <Doi doi={c.source_doi} /> <span className="dim">· {c.query}</span>
                {c.test_ids.length > 0 && (
                  <details>
                    <summary>{c.test_ids.length} test IDs</summary>
                    <div className="ids mono">{c.test_ids.join(', ')}</div>
                    <button type="button" className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => showTests({ ids: c.test_ids, label: `Cited tests (${c.query})` })}>
                      View in table
                    </button>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
        <span className="num">n = {r.n ?? 'stated in the answer text'}{r.n != null && ' cited tests'}</span>
      </div>
      )}
      <div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={copy}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied ? 'Copied' : 'Copy answer'}
        </button>
      </div>
    </article>
  );
}

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  pending?: { token: number; question: string } | null; // a question sent from elsewhere on the page
  draft?: { token: number; question: string } | null;   // a question typed into the box but NOT sent
  llmUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function Sidebar({ open, onClose, pending, draft, llmUrl = ENV_URL, fetchImpl, timeoutMs }: SidebarProps) {
  const data = useData();
  const { setScenarioId, setExtraCard } = useUi();
  const [level, setLevel] = useState<Level>('basic');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoBoard, setAutoBoard] = useState(true);
  const panel = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const [conn, setConn] = useState<Conn>('idle');
  const [status, setStatus] = useState<LlmStatus | null>(null);
  const [connectedUrl, setConnectedUrl] = useState<string | undefined>(undefined);
  const apiUrl = llmUrl ?? connectedUrl;
  const tagFor = (l: Level): string | undefined => {
    const tier = LEVEL_TIER[l];
    if (!tier) return undefined;
    return status?.models.find((m) => m.tier === tier)?.tag ?? DEFAULT_TAGS[tier];
  };
  const missing = (l: Level): boolean => {
    const tier = LEVEL_TIER[l];
    if (!tier || !status) return false;
    return !status.available || !status.models.some((m) => m.tier === tier && m.installed);
  };
  const connect = async () => {
    const url = llmUrl ?? DEFAULT_API_URL;
    setConn('connecting');
    try {
      const st = await fetchLlmStatus(url, fetchImpl);
      setStatus(st);
      if (st.available) { setConnectedUrl(url); setConn('connected'); } else { setConn('no_ollama'); }
    } catch {
      setStatus(null); setConn('no_api');
    }
  };

  const applyBoardAction = (q: string): string | null => {
    if (!autoBoard) return null;
    if (/(heptane|methanol|faster|burn(ing)? rate|\bfuels?\b)/i.test(q)) {
      const title = 'Does more oxygen make fuel burn faster?';
      setExtraCard?.({ type: 'burning_rate_line', addedBy: 'si', title });
      return title;
    }
    if (/(investigations?\b|pillars?\b|\bprevention\b|\bdetection\b)/i.test(q)) {
      const title = 'Investigations & fire-safety pillars';
      setExtraCard?.({ type: 'investigations_pillars', addedBy: 'si', title });
      return title;
    }
    if (/(moon|lunar|habitat)/i.test(q)) {
      setScenarioId?.('lunar_challenge');
      const title = 'How did those tests end?';
      setExtraCard?.({ type: 'outcomes_bars', addedBy: 'si', title });
      return title;
    }
    if (/(suit|\beva\b|4\.3)/i.test(q)) {
      setScenarioId?.('suit');
      return null;
    }
    if (/(exploration|8\.2)/i.test(q)) {
      setScenarioId?.('exploration');
      return null;
    }
    return null;
  };

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question: q, reply: null, error: null, boardAction: null }]);
    setText(''); setBusy(true);
    try {
      const reply = await ask(q, level, data, { url: apiUrl, fetchImpl, timeoutMs, model: tagFor(level) });
      const boardAction = !reply.outOfScope ? applyBoardAction(q) : null;
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, reply, boardAction } : x)));
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: e instanceof Error ? e.message : 'unknown error' } : x)));
    } finally { setBusy(false); }
  };

  // Closed panel is removed from the tab order and from assistive technology.
  useEffect(() => {
    panel.current?.toggleAttribute('inert', !open);
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => { if (pending) void send(pending.question); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pending?.token]);
  useEffect(() => { if (draft) { setText(draft.question); input.current?.focus(); } }, [draft?.token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = log.current; if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight }); }, [turns]);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(text); };

  return (
    <aside ref={panel} id="assistant" className="drawer" data-open={open} aria-label="SI Assistant" aria-hidden={!open}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="drawer-head">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2><Sparkles size={15} aria-hidden="true" style={{ color: 'var(--mint)', verticalAlign: -2 }} /> SI Assistant</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close assistant"><X size={16} aria-hidden="true" /></button>
        </div>
        <p>
          SI (&ldquo;Super Intelligence&rdquo;, i.e. an AI/LLM assistant). Answers only from these NASA data.
          It does not calculate, predict or invent.
        </p>
        <div className="stack" style={{ gap: 6 }}>
          <div className="seg" role="group" aria-label="Assistant level">
            {LEVELS.map((l) => {
              const notInstalled = l.value !== 'basic' && missing(l.value);
              const locked = l.value !== 'basic' && (!apiUrl || notInstalled);
              const title = notInstalled ? `Model not installed: ollama pull ${tagFor(l.value)}` : locked ? LOCAL_ONLY : undefined;
              return (
                <button key={l.value} type="button" aria-pressed={level === l.value} disabled={locked} title={title}
                  onClick={() => setLevel(l.value)}>{l.label}</button>
              );
            })}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm" onClick={() => void connect()} disabled={conn === 'connecting'}>
              {conn === 'connecting' ? 'Connecting…' : conn === 'connected' ? 'Reconnect local AI' : 'Connect local AI'}
            </button>
          </div>
          <div className="level-hint" role="status" aria-live="polite">
            {conn === 'connecting' && <span>Connecting to the local API ({llmUrl ?? DEFAULT_API_URL})…</span>}
            {conn === 'connected' && status && (
              <span>
                Connected. Models:{' '}
                {status.models.map((m) => (
                  <span key={m.tier} className="mono">{m.tag} {m.installed ? '✓' : `✗ (ollama pull ${m.tag})`}{' '}</span>
                ))}
              </span>
            )}
            {conn === 'no_ollama' && (
              <span>Local API found, but Ollama was not detected. Run <span className="mono">ollama serve</span>, then <span className="mono">ollama pull {DEFAULT_TAGS.flash}</span>.</span>
            )}
            {conn === 'no_api' && (
              <span>Local AI not detected at {llmUrl ?? DEFAULT_API_URL}. Start the API (<span className="mono">uvicorn backend.app:app --app-dir src</span>) and Ollama (<span className="mono">ollama pull {DEFAULT_TAGS.flash}</span>). Basic keeps working.</span>
            )}
          </div>
          <span className="level-hint">
            {apiUrl
              ? 'Basic uses no model. Flash, Medium and Heavy use the local AI; if it does not answer in 15 s, Basic answers instead.'
              : <>Basic uses no model: precomputed, sourced answers. Flash, Medium and Heavy: {LOCAL_ONLY}.</>}
          </span>
        </div>
      </div>

      <div className="drawer-body" ref={log} role="log" aria-live="polite" aria-label="Conversation history">
        {turns.length === 0 && (
          <div className="stack">
            <p className="dim">Ask about the tests on this page. Every answer shows its sources, its n and its warnings. If the data does not cover it, the answer is &ldquo;No data&rdquo;.</p>
          </div>
        )}
        {turns.map((t) => (
          <div key={t.id} className="stack" style={{ gap: 8 }}>
            <p className="msg-q">{t.question}</p>
            <ReplyCard turn={t} onAsk={(q) => void send(q)} />
          </div>
        ))}
      </div>

      <div className="drawer-foot">
        <label className="co-auto-toggle">
          <input
            type="checkbox"
            checked={autoBoard}
            onChange={(e) => setAutoBoard(e.target.checked)}
          />
          <span>Build my board automatically</span>
        </label>
        <span className="label">Suggested questions</span>
        <div className="suggest" style={{ maxHeight: turns.length ? 76 : 180, overflowY: 'auto' }}>
          {data.answers.answers.map((a) => a.question && (
            <button key={a.id ?? a.question} type="button" disabled={busy} onClick={() => void send(a.question ?? '')}>{a.question}</button>
          ))}
        </div>
        <form className="ask" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="assistant-q">Your question</label>
          <input ref={input} id="assistant-q" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about the data…" autoComplete="off" />
          <button type="submit" className="btn btn-primary" disabled={busy || text.trim() === ''} aria-label="Send question">
            <SendHorizontal size={16} aria-hidden="true" />
          </button>
        </form>
      </div>
    </aside>
  );
}
