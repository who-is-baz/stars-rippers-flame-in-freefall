// User board: which cards sit in the left rail and the right rail of the single-screen console.
// Saved in localStorage so each visitor keeps their own board (no backend). Rails have slot limits
// so the screen never overflows: the anti-clutter rule of flame-dashboard-builder §4.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type CardType =
  | 'scenario_match'
  | 'scenario_inspector'
  | 'outcomes'
  | 'burning_rate'
  | 'coverage'
  | 'materials'
  | 'gaps'
  | 'kpi'
  | 'tests_scatter'
  | 'tests_mix'
  | 'answer'
  | 'o2_bands';

export type Side = 'left' | 'right';
export type AddedBy = 'preset' | 'user' | 'si';
export type ViewId = 'overview' | 'explore' | 'coverage' | 'charts' | 'gaps' | 'scenarios' | 'fuels' | 'materials' | 'sources';

export interface CardMeta {
  type: CardType;
  title: string;                      // the question the card answers
  sub: string;                        // chart type · dataset (gallery)
  cat: 'Start here' | 'Compare' | 'Coverage & gaps';
  side: Side;                         // preferred rail
  view: ViewId | null;                // full view opened by "Open full view" (null = none)
}

export const CATALOG: CardMeta[] = [
  { type: 'scenario_match', title: 'How many tests match this air?', sub: 'Ring · FLEX · PSI-69', cat: 'Start here', side: 'left', view: 'scenarios' },
  { type: 'scenario_inspector', title: 'What air are we looking at?', sub: 'Inspector · scenarios', cat: 'Start here', side: 'right', view: 'scenarios' },
  { type: 'gaps', title: "What can't these data tell us?", sub: 'List · PSI-69 + PSI-25', cat: 'Coverage & gaps', side: 'left', view: 'gaps' },
  { type: 'outcomes', title: 'How did those tests end?', sub: 'Bars · FLEX · PSI-69', cat: 'Start here', side: 'right', view: 'scenarios' },
  { type: 'burning_rate', title: 'Does more oxygen make fuel burn faster?', sub: 'Line or bars · FLEX', cat: 'Compare', side: 'left', view: 'fuels' },
  { type: 'coverage', title: 'Which conditions were tested?', sub: 'Radar · FLEX · PSI-69', cat: 'Coverage & gaps', side: 'right', view: 'coverage' },
  { type: 'materials', title: 'Which solid materials were tested?', sub: 'Counts · BASS-II · PSI-25', cat: 'Compare', side: 'left', view: 'materials' },
  { type: 'kpi', title: 'Dataset at a glance', sub: 'Rings · meta + coverage', cat: 'Coverage & gaps', side: 'right', view: 'sources' },
  { type: 'tests_scatter', title: 'Every test: oxygen vs burning rate', sub: 'Scatter · FLEX · PSI-69', cat: 'Compare', side: 'left', view: 'charts' },
  { type: 'tests_mix', title: 'What does the data set contain?', sub: 'Bars · FLEX + BASS-II', cat: 'Start here', side: 'right', view: 'charts' },
  { type: 'o2_bands', title: 'How many tests per oxygen level?', sub: 'Bars · FLEX · PSI-69', cat: 'Coverage & gaps', side: 'right', view: 'charts' },
  { type: 'answer', title: 'Quick answers, with sources', sub: 'Text · answers.json', cat: 'Start here', side: 'right', view: null },
];
export const cardMeta = (t: CardType): CardMeta => CATALOG.find((c) => c.type === t) ?? CATALOG[0];

// Slot limits per rail: what fits on a ~950 px tall screen without scrolling.
export const MAX_PER_SIDE: Record<Side, number> = { left: 3, right: 2 };

export interface Board {
  left: CardType[];
  right: CardType[];
  collapsed: CardType[];
  addedBy: Partial<Record<CardType, AddedBy>>;
}

export type PresetId = 'starter' | 'full' | 'engineer' | 'moon';
export const PRESETS: { id: PresetId; label: string; board: Board }[] = [
  {
    id: 'starter',
    label: 'Essential (3)',
    board: {
      left: ['scenario_match', 'gaps'],
      right: ['scenario_inspector'],
      collapsed: [],
      addedBy: {},
    },
  },
  {
    id: 'full',
    label: 'Full (5)',
    board: {
      left: ['scenario_match', 'burning_rate', 'gaps'],
      right: ['scenario_inspector', 'coverage'],
      collapsed: [],
      addedBy: {},
    },
  },
  { id: 'engineer', label: 'Engineer', board: { left: ['burning_rate', 'tests_scatter'], right: ['coverage', 'materials'], collapsed: [], addedBy: {} } },
  { id: 'moon', label: 'Moon-base', board: { left: ['scenario_match', 'outcomes', 'gaps'], right: ['scenario_inspector', 'coverage'], collapsed: [], addedBy: {} } },
];
export const STARTER: Board = PRESETS[0].board;

export const STORAGE_KEY = 'fif.board.v3';
const ALL = new Set<string>(CATALOG.map((c) => c.type));

// Never trust what is in storage: drop unknown types, duplicates and anything over the slot limit.
export function sanitize(raw: unknown): Board {
  if (!raw || typeof raw !== 'object') return STARTER;
  const r = raw as Partial<Board>;
  const seen = new Set<string>();
  const clean = (xs: unknown, side: Side): CardType[] =>
    (Array.isArray(xs) ? xs : [])
      .filter((x): x is CardType => typeof x === 'string' && ALL.has(x) && !seen.has(x) && (seen.add(x), true))
      .slice(0, MAX_PER_SIDE[side]);
  const left = clean(r.left, 'left');
  const right = clean(r.right, 'right');
  const collapsed = (Array.isArray(r.collapsed) ? r.collapsed : []).filter((x): x is CardType => seen.has(x as string));
  const addedBy: Board['addedBy'] = {};
  for (const [k, v] of Object.entries(r.addedBy ?? {})) if (seen.has(k) && (v === 'user' || v === 'si' || v === 'preset')) addedBy[k as CardType] = v;
  return { left, right, collapsed, addedBy };
}

function load(): Board {
  try {
    const s = window.localStorage.getItem(STORAGE_KEY);
    return s ? sanitize(JSON.parse(s)) : STARTER;
  } catch {
    return STARTER;
  }
}

export const sideOf = (b: Board, t: CardType): Side | null => (b.left.includes(t) ? 'left' : b.right.includes(t) ? 'right' : null);
export const countCards = (b: Board) => b.left.length + b.right.length;

export type AddResult = { ok: true; side: Side } | { ok: false; reason: string };

export interface Notice { token: number; text: string; undoable: boolean; warn?: boolean }

export interface BoardApi {
  board: Board;
  notice: Notice | null;
  dismissNotice: () => void;
  add: (t: CardType, by?: AddedBy) => AddResult;
  remove: (t: CardType) => void;
  move: (t: CardType, dir: 'up' | 'down') => void;
  switchSide: (t: CardType) => AddResult;
  toggleCollapse: (t: CardType) => void;
  applyPreset: (id: PresetId) => void;
  undo: () => void;
  canUndo: boolean;
}

export function useBoardState(): BoardApi {
  const [board, setBoard] = useState<Board>(load);
  // The ref always holds the newest board: actions fired in the same tick (e.g. the SI adding two cards, or
  // removing several at once) each start from the result of the previous one instead of a stale copy.
  const latest = useRef<Board>(board);
  const history = useRef<Board[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const say = useCallback((text: string, undoable: boolean, warn = false) => setNotice({ token: Date.now(), text, undoable, warn }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board)); } catch { /* private mode: board lives in memory only */ }
  }, [board]);

  const commit = useCallback((next: Board) => {
    history.current = [...history.current.slice(-9), latest.current];
    latest.current = next;
    setBoard(next);
    setCanUndo(true);
  }, []);

  const add = useCallback((t: CardType, by: AddedBy = 'user'): AddResult => {
    const b = latest.current;
    const existing = sideOf(b, t);
    if (existing) return { ok: true, side: existing };
    const pref = cardMeta(t).side;
    const other: Side = pref === 'left' ? 'right' : 'left';
    const side = b[pref].length < MAX_PER_SIDE[pref] ? pref : b[other].length < MAX_PER_SIDE[other] ? other : null;
    if (!side) {
      const reason = 'Your board is full. Remove a card first.';
      say(reason, false, true);
      return { ok: false, reason };
    }
    commit({ ...b, [side]: [...b[side], t], addedBy: { ...b.addedBy, [t]: by } });
    say(`${by === 'si' ? 'Added by SI' : 'Card added'}: ${cardMeta(t).title}`, true);
    return { ok: true, side };
  }, [commit, say]);

  const remove = useCallback((t: CardType) => {
    const b = latest.current;
    if (!sideOf(b, t)) return;
    const { [t]: _drop, ...addedBy } = b.addedBy;
    commit({ left: b.left.filter((x) => x !== t), right: b.right.filter((x) => x !== t), collapsed: b.collapsed.filter((x) => x !== t), addedBy });
  }, [commit]);

  const move = useCallback((t: CardType, dir: 'up' | 'down') => {
    const b = latest.current;
    const side = sideOf(b, t);
    if (!side) return;
    const list = [...b[side]];
    const i = list.indexOf(t);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    commit({ ...b, [side]: list });
  }, [commit]);

  const switchSide = useCallback((t: CardType): AddResult => {
    const b = latest.current;
    const side = sideOf(b, t);
    if (!side) return { ok: false, reason: 'Card is not on the board.' };
    const to: Side = side === 'left' ? 'right' : 'left';
    if (b[to].length >= MAX_PER_SIDE[to]) {
      const reason = `The ${to} side is full (${MAX_PER_SIDE[to]} cards).`;
      say(reason, false, true);
      return { ok: false, reason };
    }
    commit({ ...b, [side]: b[side].filter((x) => x !== t), [to]: [...b[to], t] });
    return { ok: true, side: to };
  }, [commit, say]);

  const toggleCollapse = useCallback((t: CardType) => {
    // Collapsing is a view preference, not an edit worth undoing, but it is still saved.
    const b = latest.current;
    const next = { ...b, collapsed: b.collapsed.includes(t) ? b.collapsed.filter((x) => x !== t) : [...b.collapsed, t] };
    latest.current = next;
    setBoard(next);
  }, []);

  const applyPreset = useCallback((id: PresetId) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) commit(p.board);
  }, [commit]);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (prev) { latest.current = prev; setBoard(prev); }
    setCanUndo(history.current.length > 0);
    setNotice(null);
  }, []);

  return useMemo(
    () => ({ board, notice, dismissNotice, add, remove, move, switchSide, toggleCollapse, applyPreset, undo, canUndo }),
    [board, notice, dismissNotice, add, remove, move, switchSide, toggleCollapse, applyPreset, undo, canUndo],
  );
}

export const BoardContext = createContext<BoardApi | null>(null);
export function useBoard(): BoardApi {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used inside <BoardProvider>');
  return ctx;
}
