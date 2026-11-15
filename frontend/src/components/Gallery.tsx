// Customize drawer: manage the cards on the board (move, remove) and add new ones from the catalog.
import { useState } from 'react';
import { ArrowLeftRight, ChevronDown, ChevronUp, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { CATALOG, MAX_PER_SIDE, PRESETS, cardMeta, countCards, sideOf, useBoard, type CardType } from '../state/board';

const CATS = ['All', 'Start here', 'Compare', 'Coverage & gaps'] as const;

function Preview({ type }: { type: CardType }) {
  const w = 68, h = 38;
  const svg = (children: React.ReactNode) => <svg width={w} height={h} viewBox="0 0 70 40" aria-hidden="true">{children}</svg>;
  switch (type) {
    case 'burning_rate': return svg(<><polyline points="5,32 20,28 35,26 50,18 65,10" fill="none" stroke="var(--fuel-heptane)" strokeWidth="1.6" /><polyline points="5,35 20,33 35,29 50,25 65,14" fill="none" stroke="var(--fuel-methanol)" strokeWidth="1.6" /></>);
    case 'outcomes': return svg(<><rect x="5" y="8" width="44" height="6" rx="2" fill="var(--out-disruption)" /><rect x="5" y="18" width="12" height="6" rx="2" fill="var(--out-completion)" /><rect x="5" y="28" width="4" height="6" rx="1" fill="var(--out-extinction)" /></>);
    case 'coverage': return svg(<><polygon points="35,5 60,20 50,36 20,36 10,20" fill="var(--cov-2)" stroke="var(--mint)" strokeWidth="1" /><polygon points="35,5 60,20 50,36 20,36 10,20" fill="none" stroke="var(--ink-faint)" strokeDasharray="2 2" transform="translate(0 0) scale(1)" opacity=".4" /></>);
    case 'materials': return svg(<><rect x="5" y="7" width="46" height="6" rx="2" fill="var(--prog-bass2)" opacity=".75" /><rect x="5" y="18" width="28" height="6" rx="2" fill="var(--prog-bass2)" opacity=".5" /><rect x="5" y="29" width="22" height="6" rx="2" fill="none" stroke="var(--ink-dim)" strokeDasharray="2 2" /></>);
    case 'gaps': return svg(<><rect x="5" y="6" width="60" height="10" rx="3" fill="none" stroke="var(--ink-dim)" strokeDasharray="3 2" /><rect x="5" y="22" width="60" height="10" rx="3" fill="none" stroke="var(--ink-dim)" strokeDasharray="3 2" /></>);
    case 'tests_scatter': return svg(<g fill="var(--fuel-heptane)"><circle cx="12" cy="30" r="2" /><circle cx="24" cy="24" r="2" /><circle cx="36" cy="26" r="2" /><circle cx="48" cy="14" r="2" /><circle cx="58" cy="10" r="2" /><circle cx="30" cy="30" r="2" fill="var(--fuel-methanol)" /><circle cx="44" cy="20" r="2" fill="var(--fuel-methanol)" /></g>);
    case 'o2_bands': return svg(<><rect x="8" y="22" width="7" height="14" rx="1.5" fill="var(--fuel-heptane)" /><rect x="17" y="14" width="7" height="22" rx="1.5" fill="var(--fuel-methanol)" /><rect x="30" y="10" width="7" height="26" rx="1.5" fill="var(--fuel-heptane)" /><rect x="39" y="16" width="7" height="20" rx="1.5" fill="var(--fuel-methanol)" /><rect x="52" y="18" width="7" height="18" rx="1.5" fill="var(--fuel-heptane)" /></>);
    case 'answer': return svg(<><rect x="6" y="8" width="58" height="6" rx="2" fill="var(--ink-dim)" opacity=".5" /><rect x="6" y="19" width="48" height="4" rx="2" fill="var(--ink-dim)" opacity=".35" /><rect x="6" y="27" width="52" height="4" rx="2" fill="var(--ink-dim)" opacity=".35" /></>);
    case 'tests_mix': return svg(<><circle cx="35" cy="20" r="13" fill="none" stroke="var(--fuel-heptane)" strokeWidth="6" strokeDasharray="30 52" /><circle cx="35" cy="20" r="13" fill="none" stroke="var(--fuel-methanol)" strokeWidth="6" strokeDasharray="30 52" strokeDashoffset="-31" /><circle cx="35" cy="20" r="13" fill="none" stroke="var(--prog-bass2)" strokeWidth="6" strokeDasharray="18 64" strokeDashoffset="-62" /></>);
    case 'kpi': return svg(<><circle cx="20" cy="20" r="12" fill="none" stroke="var(--graphite-7)" strokeWidth="4" /><circle cx="20" cy="20" r="12" fill="none" stroke="var(--mint)" strokeWidth="4" strokeDasharray="50 76" /><circle cx="50" cy="20" r="12" fill="none" stroke="var(--graphite-7)" strokeWidth="4" /><circle cx="50" cy="20" r="12" fill="none" stroke="var(--mint)" strokeWidth="4" strokeDasharray="22 76" /></>);
    case 'scenario_inspector': return svg(<><circle cx="35" cy="20" r="14" fill="var(--flame-blue)" opacity=".4" /><circle cx="35" cy="20" r="3" fill="var(--ink)" /></>);
    default: return svg(<><circle cx="35" cy="20" r="14" fill="none" stroke="var(--graphite-7)" strokeWidth="5" /><circle cx="35" cy="20" r="14" fill="none" stroke="var(--mint)" strokeWidth="5" strokeDasharray="60 88" /></>);
  }
}

export function Gallery({ onClose }: { onClose: () => void }) {
  const api = useBoard();
  const { board } = api;
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const [q, setQ] = useState('');
  const total = CATALOG.length;
  const on = countCards(board);
  const max = MAX_PER_SIDE.left + MAX_PER_SIDE.right;
  const list = CATALOG.filter((c) => (cat === 'All' || c.cat === cat) && (!q.trim() || c.title.toLowerCase().includes(q.toLowerCase())));
  const yours = [...board.left, ...board.right];

  return (
    <aside className="glass gallery-drawer" aria-label="Customize your board">
      <div className="wc-hd">
        <h2>Your board · {on} of {max} slots</h2>
        <button type="button" className="icon-btn" aria-label="Close customize" onClick={onClose}><X size={15} aria-hidden="true" /></button>
      </div>

      <div className="gallery-tabs" role="group" aria-label="Presets">
        {PRESETS.map((p) => <button key={p.id} type="button" onClick={() => api.applyPreset(p.id)}>{p.label}</button>)}
        <button type="button" onClick={() => api.applyPreset('starter')} title="Back to the Starter board"><RotateCcw size={11} aria-hidden="true" /> Reset</button>
      </div>

      <ul className="own-list" aria-label="Cards on your board">
        {yours.length === 0 && <li className="dim">No cards. Add one below.</li>}
        {yours.map((t) => {
          const side = sideOf(board, t)!;
          const idx = board[side].indexOf(t);
          return (
            <li key={t}>
              <span className="own-t">{cardMeta(t).title}<small>{side} side</small></span>
              <button type="button" className="icon-btn" aria-label={`Move up: ${cardMeta(t).title}`} disabled={idx === 0} onClick={() => api.move(t, 'up')}><ChevronUp size={12} aria-hidden="true" /></button>
              <button type="button" className="icon-btn" aria-label={`Move down: ${cardMeta(t).title}`} disabled={idx === board[side].length - 1} onClick={() => api.move(t, 'down')}><ChevronDown size={12} aria-hidden="true" /></button>
              <button type="button" className="icon-btn" aria-label={`Switch side: ${cardMeta(t).title}`} onClick={() => api.switchSide(t)}><ArrowLeftRight size={12} aria-hidden="true" /></button>
              <button type="button" className="icon-btn" aria-label={`Remove: ${cardMeta(t).title}`} onClick={() => api.remove(t)}><Trash2 size={12} aria-hidden="true" /></button>
            </li>
          );
        })}
      </ul>

      <div className="wc-hd" style={{ marginBottom: 0 }}><h2>Add a card</h2><span className="dim num" style={{ fontSize: 'var(--fs-xs)' }}>{on} of {total} on board</span></div>
      <label className="gallery-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions…" aria-label="Search card templates" />
      </label>
      <div className="gallery-tabs" role="group" aria-label="Card categories">
        {CATS.map((c) => <button key={c} type="button" className={cat === c ? 'on' : ''} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="gallery-list">
        {list.map((c) => {
          const added = sideOf(board, c.type) != null;
          return (
            <div key={c.type} className="gallery-item">
              <div className="gallery-pv"><Preview type={c.type} /></div>
              <div className="gallery-meta"><b>{c.title}</b><small>{c.sub}</small></div>
              <button type="button" className="gallery-add" disabled={added} aria-label={added ? `Already on board: ${c.title}` : `Add card: ${c.title}`} onClick={() => api.add(c.type, 'user')}>
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
        {list.length === 0 && <p className="dim">No card matches that search.</p>}
      </div>
    </aside>
  );
}
