import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import type { ExperimentRow } from '../data/types';
import { useExperiments, useMeta } from '../data/useData';
import type { TablePreset } from '../state/ui';
import { useActiveAtmosphere } from '../state/atmosphere';
import { TestDrawer } from './TestDrawer';
import { EMPTY_EXP, filterRanked, fromHash, orderRanked, toHash, type ExpFilters } from '../lib/experimentsView';
import { RELEVANCE_LABEL, rankByRelevance, type Ranked } from '../lib/relevance';
import { isComplete } from '../lib/indicators';
import { useUi } from '../state/ui';
import { Badge, Doi, EmptyState, QcChips, Section } from '../components/ui';
import { fmtO2, fmtPressure, fmtRate } from '../lib/format';
import { DISRUPTION_SHORT, LOW_CONFIDENCE_WARNING, NOT_STATED_NOTE, hasLowConfidence, outcomeLabel } from '../lib/honesty';
import { rowKey, type Suppressant } from '../lib/filters';
import { downloadText, kindOf, toCsv, type Sort, type SortKey } from '../lib/table';

const PAGE = 25;
const SUPPRESSANTS: { value: Suppressant; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'co2', label: 'CO₂' }, { value: 'he', label: 'He' },
];

function Outcome({ r }: { r: ExperimentRow }) {
  if (r.outcome == null) return <span className="dim" title={NOT_STATED_NOTE}>Not stated by the source</span>;
  return (
    <span className="chips" style={{ alignItems: 'center' }}>
      <span>{outcomeLabel(r.outcome)}</span>
      {r.outcome === 'disruption' && <span className="dim">({DISRUPTION_SHORT})</span>}
      {r.outcome_source === 'ai_extracted' && <Badge tone="info" title="Outcome read from free-text notes by AI; pending human review">AI-extracted</Badge>}
      {hasLowConfidence(r.qc_flags) && <Badge tone="caution" title={LOW_CONFIDENCE_WARNING}>Low confidence</Badge>}
    </span>
  );
}

function SortHead({ k, label, sort, onSort, right }: { k: SortKey; label: string; sort: Sort | null; onSort: (k: SortKey) => void; right?: boolean }) {
  const active = sort?.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className={right ? 'r' : undefined} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort" onClick={() => onSort(k)}>{label}<Icon size={12} aria-hidden="true" /></button>
    </th>
  );
}

const OUTCOME_OPTIONS = ['extinction', 'disruption', 'completion', 'blowoff', 'no_ignition', 'not_sustained', 'not_stated'] as const;
const sgn = (x: number | null, nd: number, scale = 1) => (x == null ? '—' : `${x >= 0 ? '+' : ''}${(x * scale).toFixed(nd)}`);

export function ExperimentTable({ preset }: { preset: TablePreset | null }) {
  const { items, columns } = useExperiments();
  const meta = useMeta();
  const atm = useActiveAtmosphere();
  const { openView } = useUi();
  const [f, setF] = useState<ExpFilters>(() => ({ ...EMPTY_EXP, ...(typeof window !== 'undefined' ? fromHash(window.location.hash) : {}) }));
  const [idsLabel, setIdsLabel] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort | null>(null);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Ranked | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  // Filters take several screens on a phone: collapsed there by default, open on larger screens.
  const [filtersOpen, setFiltersOpen] = useState(() => !(typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 760px)').matches));

  // A preset (from a scenario, a coverage cell or the assistant) replaces the current filters.
  useEffect(() => {
    if (!preset) return;
    setF({ ...EMPTY_EXP, ids: preset.ids ?? null, program: preset.program ?? '', kind: preset.fuel ?? '', o2Band: preset.o2Band ?? '', pressure: preset.pressure ?? '' });
    setIdsLabel(preset.ids ? preset.label ?? 'Selected tests' : null);
    setPage(0);
  }, [preset]);
  // Filters live in the URL hash (replaceState: no history entries); cleared when the view closes.
  useEffect(() => {
    try { const h = toHash(f); window.history.replaceState(null, '', h || window.location.pathname + window.location.search); } catch { /* sandboxed */ }
  }, [f]);
  useEffect(() => () => { try { if (window.location.hash.startsWith('#experiments')) window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch { /* ignore */ } }, []);

  const ranked = useMemo(() => (atm ? rankByRelevance(items, atm, meta) : items.map((row) => ({ row, relevance: 'not_near' as const, dO2: 0, dPsi: null, distance: 0, n: 0, declared: true }))), [items, atm, meta]);
  const kinds = useMemo(() => [...new Set(items.filter((r) => !f.program || r.program === f.program).map(kindOf))].sort(), [items, f.program]);
  const filtered = useMemo(() => filterRanked(ranked, f, meta), [ranked, f, meta]);
  const rows = useMemo(() => orderRanked(filtered, sort, f.group), [filtered, sort, f.group]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const view = rows.slice(safePage * PAGE, safePage * PAGE + PAGE);

  const set = (patch: Partial<ExpFilters>) => { setF((p) => ({ ...p, ...patch })); setPage(0); };
  const onSort = (key: SortKey) => setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));
  const reset = () => { setF(EMPTY_EXP); setIdsLabel(null); setSort(null); setPage(0); };
  const dirty = JSON.stringify(f) !== JSON.stringify(EMPTY_EXP);
  const openRow = (r: Ranked, el: HTMLElement) => { trigger.current = el; setOpen(r); };
  const closeRow = () => { setOpen(null); trigger.current?.focus(); };

  return (
    <Section id="experiments" eyebrow="Experiments" title="Every test, ordered by relevance to the selected atmosphere"
      lead={<>All {items.length} tests from the two NASA PSI investigations. Values are shown as recorded; doubtful values keep their QC flags
        instead of being corrected. Extinction diameter is shown only when the outcome was extinction.</>}>
      <div className="glass card stack">
        <p className="rel-note" role="note">
          {atm ? <>Relevance to <strong>{atm.label}</strong> ({atm.source === 'custom' ? 'your Custom settings' : 'selected scenario'}): Exact → Near → Not near → No pressure recorded; within a class, by distance max(|ΔO₂|/tol, |Δpsi|/tol), then a declared outcome, then larger n.
            It orders records by closeness of conditions; it is not a safety ranking. </> : null}
          <button type="button" className="ind-link" onClick={() => openView?.('sources')}>How it is computed</button>
          {sort && <> · <button type="button" className="ind-link" onClick={() => setSort(null)}>Back to relevance order</button></>}
        </p>
        <details className="filters-wrap" open={filtersOpen} onToggle={(e) => setFiltersOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>Filters{dirty ? ' (active)' : ''}</summary>
        <form className="filters" role="search" aria-label="Filter experiments" onSubmit={(e) => e.preventDefault()}>
          <label className="field">Search
            <input type="search" value={f.q} placeholder="Test ID, fuel, material…" onChange={(e) => set({ q: e.target.value })} />
          </label>
          <label className="field">Investigation
            <select value={f.program} onChange={(e) => set({ program: e.target.value as ExpFilters['program'], kind: '' })}>
              <option value="">All investigations</option>
              {meta.programs.map((p) => <option key={p.program} value={p.program}>{p.program}</option>)}
            </select>
          </label>
          <label className="field">Fuel / material
            <select value={f.kind} onChange={(e) => set({ kind: e.target.value })}>
              <option value="">All</option>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="field">O₂ min (%)
            <input type="number" inputMode="decimal" min={0} max={100} step={0.5} value={f.o2Min} onChange={(e) => set({ o2Min: e.target.value })} />
          </label>
          <label className="field">O₂ max (%)
            <input type="number" inputMode="decimal" min={0} max={100} step={0.5} value={f.o2Max} onChange={(e) => set({ o2Max: e.target.value })} />
          </label>
          <label className="field">Pressure min (psi)
            <input type="number" inputMode="decimal" min={0} step={0.5} value={f.psiMin} onChange={(e) => set({ psiMin: e.target.value })} />
          </label>
          <label className="field">Pressure max (psi)
            <input type="number" inputMode="decimal" min={0} step={0.5} value={f.psiMax} onChange={(e) => set({ psiMax: e.target.value })} />
          </label>
          <label className="field">Declared outcome
            <select value={f.outcome} onChange={(e) => set({ outcome: e.target.value as ExpFilters['outcome'] })}>
              <option value="">All</option>
              {OUTCOME_OPTIONS.map((o) => <option key={o} value={o}>{o === 'not_stated' ? 'Not stated (BASS-II)' : o}</option>)}
            </select>
          </label>
          <label className="field">Record
            <select value={f.completeness} onChange={(e) => set({ completeness: e.target.value as ExpFilters['completeness'] })}>
              <option value="">All records</option><option value="complete">Complete</option><option value="partial">Partial</option>
            </select>
          </label>
          <label className="field">n / confidence
            <select value={f.evidence} onChange={(e) => set({ evidence: e.target.value as ExpFilters['evidence'] })}>
              <option value="">All</option><option value="small_n">Cell with n &lt; {meta.min_n}</option><option value="low_confidence">Low-confidence AI extraction</option>
            </select>
          </label>
          <label className="field">AI-extracted outcome
            <select value={f.ai} onChange={(e) => set({ ai: e.target.value as ExpFilters['ai'] })}>
              <option value="">All</option><option value="yes">Only AI-extracted</option><option value="no">Not AI-extracted</option>
            </select>
          </label>
          <label className="field">Relevance to this atmosphere
            <select value={f.relevance} onChange={(e) => set({ relevance: e.target.value as ExpFilters['relevance'] })}>
              <option value="">All</option><option value="exact">Exact</option><option value="near">Near</option><option value="exact_near">Exact + near</option>
              <option value="not_near">Not near</option><option value="no_pressure">No pressure recorded</option>
            </select>
          </label>
          <label className="field">Suppressant (FLEX)
            <select value={f.suppressant} onChange={(e) => set({ suppressant: e.target.value as ExpFilters['suppressant'] })}>
              <option value="">All</option>{SUPPRESSANTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="field check"><span>Group</span>
            <span className="row" style={{ gap: 6 }}><input type="checkbox" checked={f.group} onChange={(e) => set({ group: e.target.checked })} /> By investigation</span>
          </label>
        </form>
        </details>

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p aria-live="polite" className="num">
            Showing <strong>{rows.length}</strong> of {items.length} tests
            {idsLabel && <> · <Badge tone="flame">{idsLabel}</Badge></>}
          </p>
          <div className="row">
            {dirty && <button type="button" className="btn btn-sm btn-ghost" onClick={reset}><X size={14} aria-hidden="true" /> Clear filters</button>}
            <button type="button" className="btn btn-sm" disabled={rows.length === 0}
              onClick={() => downloadText('flame-in-freefall-filtered.csv', toCsv(rows.map((r) => r.row), columns))}>
              <Download size={14} aria-hidden="true" /> Export CSV ({rows.length})
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No data">
            <p>No test in the PSI data shown on this page matches these filters. This means it was not tested here, not that the value is zero.</p>
            <button type="button" className="btn btn-sm" style={{ marginTop: 12 }} onClick={reset}>Clear filters</button>
          </EmptyState>
        ) : (
          <div className="scroll-x" tabIndex={0} role="region" aria-label="Experiments table (scrolls sideways)">
            <table className="data wide">
              <caption>
                Suppressant is derived from the recorded CO₂ and He fractions (FLEX only). In BASS-II, CO₂ is a chamber measurement, not a suppressant.
                ΔO₂ is in percentage points, Δpsi in psi; “—” means pressure is not recorded.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Relevance</th>
                  <th scope="col" className="r">ΔO₂ (pp)</th>
                  <th scope="col" className="r">Δpsi</th>
                  <SortHead k="test_id" label="Test ID" sort={sort} onSort={onSort} />
                  <th scope="col">Investigation</th>
                  <SortHead k="material_or_fuel" label="Fuel / material" sort={sort} onSort={onSort} />
                  <SortHead k="o2_fraction" label="O₂" sort={sort} onSort={onSort} right />
                  <SortHead k="pressure_atm" label="Pressure" sort={sort} onSort={onSort} right />
                  <SortHead k="outcome" label="Outcome" sort={sort} onSort={onSort} />
                  <th scope="col">Record</th>
                  <th scope="col" className="r">n</th>
                  <SortHead k="burning_rate_mm2_s" label="Burning rate" sort={sort} onSort={onSort} right />
                  <SortHead k="date" label="Date" sort={sort} onSort={onSort} />
                  <th scope="col">QC flags</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {view.map((rk, i) => {
                  const r = rk.row;
                  const first = f.group && (i === 0 || view[i - 1].row.program !== r.program);
                  return (
                    <Fragment key={rowKey(r, safePage * PAGE + i)}>
                      {first && (
                        <tr className="group-row"><th scope="rowgroup" colSpan={15}>{r.program} · {meta.programs.find((p) => p.program === r.program)?.psi_id} · {rows.filter((x) => x.row.program === r.program).length} tests in this view</th></tr>
                      )}
                      <tr className={`rel-${rk.relevance}`}>
                        <td><Badge tone={rk.relevance === 'exact' ? 'flame' : rk.relevance === 'near' ? 'info' : 'neutral'}>{RELEVANCE_LABEL[rk.relevance]}</Badge></td>
                        <td className="r num">{sgn(rk.dO2, 2, 100)}</td>
                        <td className="r num">{sgn(rk.dPsi, 2)}</td>
                        <th scope="row" className="mono"><button type="button" className="ind-link mono" aria-label={`Open details of test ${r.test_id} (${r.program})`} onClick={(e) => openRow(rk, e.currentTarget)}>{r.test_id}</button></th>
                        <td>{r.program}</td>
                        <td className="wrap">{r.material_or_fuel}</td>
                        <td className="r num">{fmtO2(r.o2_fraction)}</td>
                        <td className="r num">{fmtPressure(r.pressure_atm)}</td>
                        <td className="wrap"><Outcome r={r} /></td>
                        <td>{isComplete(r) ? 'Complete' : 'Partial'}</td>
                        <td className={`r num${rk.n < meta.min_n ? ' warn-text' : ''}`} title={rk.n < meta.min_n ? `n < ${meta.min_n}: small sample` : undefined}>{rk.n}</td>
                        <td className="r num">{r.burning_rate_mm2_s == null ? <span className="nodata">No data</span> : fmtRate(r.burning_rate_mm2_s)}</td>
                        <td className="num" style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                        <td><QcChips flags={r.qc_flags} /></td>
                        <td><Doi doi={r.source_doi} /></td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <nav className="table-foot" aria-label="Table pages">
            <span className="num">Rows {safePage * PAGE + 1}–{safePage * PAGE + view.length} of {rows.length} · page {safePage + 1} of {pages}</span>
            <span className="row">
              <button type="button" className="btn btn-sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft size={14} aria-hidden="true" /> Previous
              </button>
              <button type="button" className="btn btn-sm" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
                Next <ChevronRight size={14} aria-hidden="true" />
              </button>
            </span>
          </nav>
        )}
        <p className="dim" style={{ fontSize: 'var(--fs-xs)' }}>
          {NOT_STATED_NOTE} &ldquo;Disruption&rdquo; is {DISRUPTION_SHORT}. Outcomes marked AI-extracted were read from free-text notes and await human review.
          Descriptive summary of NASA test records. Not a safety assessment or a forecast.
        </p>
      </div>
      {open && <TestDrawer ranked={open} atmosphere={atm?.label ?? 'the selected atmosphere'} onClose={closeRow} />}
    </Section>
  );
}
