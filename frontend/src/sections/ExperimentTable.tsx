import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import type { ExperimentRow, O2Band, PressureLevel, Program } from '../data/types';
import { useExperiments, useMeta } from '../data/useData';
import type { TablePreset } from '../state/ui';
import { Badge, Doi, EmptyState, QcChips, Section } from '../components/ui';
import { fmtBand, fmtDiameter, fmtGas, fmtO2, fmtPressure, fmtRate } from '../lib/format';
import { DISRUPTION_SHORT, LOW_CONFIDENCE_WARNING, NOT_STATED_NOTE, hasLowConfidence, outcomeLabel } from '../lib/honesty';
import { rowKey, type Suppressant } from '../lib/filters';
import { EMPTY_FILTERS, NOT_RECORDED, downloadText, filterRows, kindOf, sortRows, toCsv, type Sort, type SortKey, type TableFilters } from '../lib/table';

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

export function ExperimentTable({ preset }: { preset: TablePreset | null }) {
  const { items, columns } = useExperiments();
  const meta = useMeta();
  const [f, setF] = useState<TableFilters>(EMPTY_FILTERS);
  const [idsLabel, setIdsLabel] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort | null>(null);
  const [page, setPage] = useState(0);

  // A preset (from a scenario or a coverage cell) replaces the current filters.
  useEffect(() => {
    if (!preset) return;
    setF({ ...EMPTY_FILTERS, ids: preset.ids ?? null, program: preset.program ?? '', kind: preset.fuel ?? '', o2Band: preset.o2Band ?? '', pressure: preset.pressure ?? '' });
    setIdsLabel(preset.ids ? preset.label ?? 'Selected tests' : null);
    setPage(0);
  }, [preset]);

  const kinds = useMemo(() => [...new Set(items.filter((r) => !f.program || r.program === f.program).map(kindOf))].sort(), [items, f.program]);
  // Default order: FLEX (the core dataset) first, then BASS-II, each in file order.
  const ordered = useMemo(() => [...items.filter((r) => r.program === 'FLEX'), ...items.filter((r) => r.program !== 'FLEX')], [items]);
  const rows = useMemo(() => sortRows(filterRows(ordered, f, meta), sort), [ordered, f, meta, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const view = rows.slice(safePage * PAGE, safePage * PAGE + PAGE);

  const set = (patch: Partial<TableFilters>) => { setF((p) => ({ ...p, ...patch })); setPage(0); };
  const onSort = (key: SortKey) => setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));
  const reset = () => { setF(EMPTY_FILTERS); setIdsLabel(null); setPage(0); };
  const dirty = JSON.stringify(f) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <Section id="experiments" eyebrow="Experiment table" title="Every test, one row each"
      lead={<>All {items.length} tests from experiments.json. Values are shown as recorded; doubtful values keep their QC flags
        instead of being corrected. Extinction diameter is shown only when the outcome was extinction.</>}>
      <div className="glass card stack">
        <form className="filters" role="search" aria-label="Filter experiments" onSubmit={(e) => e.preventDefault()}>
          <label className="field">Search
            <input type="search" value={f.q} placeholder="Test ID, fuel, material…" onChange={(e) => set({ q: e.target.value })} />
          </label>
          <label className="field">Program
            <select value={f.program} onChange={(e) => set({ program: e.target.value as Program | '', kind: '' })}>
              <option value="">All programs</option>
              {meta.programs.map((p) => <option key={p.program} value={p.program}>{p.program}</option>)}
            </select>
          </label>
          <label className="field">Fuel / material
            <select value={f.kind} onChange={(e) => set({ kind: e.target.value })}>
              <option value="">All</option>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="field">O₂ band
            <select value={f.o2Band} onChange={(e) => set({ o2Band: e.target.value as O2Band | '' })}>
              <option value="">All</option>
              {meta.o2_bands.map((b) => <option key={b.label} value={b.label}>{fmtBand(b.label)}</option>)}
            </select>
          </label>
          <label className="field">Pressure
            <select value={f.pressure} onChange={(e) => set({ pressure: e.target.value as PressureLevel | typeof NOT_RECORDED | '' })}>
              <option value="">All</option>
              {meta.pressure_levels.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
              <option value={NOT_RECORDED}>Not recorded</option>
            </select>
          </label>
          <label className="field">Suppressant (FLEX)
            <select value={f.suppressant} onChange={(e) => set({ suppressant: e.target.value as Suppressant | '' })}>
              <option value="">All</option>
              {SUPPRESSANTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </form>

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p aria-live="polite" className="num">
            <strong>{rows.length}</strong> of {items.length} tests
            {idsLabel && <> · <Badge tone="flame">{idsLabel}</Badge></>}
          </p>
          <div className="row">
            {dirty && <button type="button" className="btn btn-sm btn-ghost" onClick={reset}><X size={14} aria-hidden="true" /> Clear filters</button>}
            <button type="button" className="btn btn-sm" disabled={rows.length === 0}
              onClick={() => downloadText('flame-in-freefall-filtered.csv', toCsv(rows, columns))}>
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
          <div className="scroll-x">
            <table className="data wide">
              <caption>
                Suppressant is derived from the recorded CO₂ and He fractions (FLEX only). In BASS-II, CO₂ is a chamber measurement, not a suppressant.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Program</th>
                  <SortHead k="test_id" label="Test ID" sort={sort} onSort={onSort} />
                  <SortHead k="date" label="Date" sort={sort} onSort={onSort} />
                  <SortHead k="material_or_fuel" label="Fuel / material" sort={sort} onSort={onSort} />
                  <SortHead k="o2_fraction" label="O₂" sort={sort} onSort={onSort} right />
                  <SortHead k="pressure_atm" label="Pressure" sort={sort} onSort={onSort} right />
                  <th scope="col" className="r">CO₂ / He</th>
                  <SortHead k="outcome" label="Outcome" sort={sort} onSort={onSort} />
                  <SortHead k="extinction_diameter_mm" label="Ext. diameter" sort={sort} onSort={onSort} right />
                  <SortHead k="burning_rate_mm2_s" label="Burning rate" sort={sort} onSort={onSort} right />
                  <th scope="col">QC flags</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => (
                  <tr key={rowKey(r, safePage * PAGE + i)}>
                    <td>{r.program}</td>
                    <th scope="row" className="mono">{r.test_id}</th>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td className="wrap">{r.material_or_fuel}</td>
                    <td className="r num">{fmtO2(r.o2_fraction)}</td>
                    <td className="r num">{fmtPressure(r.pressure_atm)}</td>
                    <td className="r num">{fmtGas(r.co2_fraction, 'CO₂')}<br />{fmtGas(r.he_fraction, 'He')}</td>
                    <td className="wrap"><Outcome r={r} /></td>
                    <td className="r num">
                      {r.outcome === 'extinction'
                        ? (r.extinction_diameter_mm == null ? <span className="nodata">No data</span> : fmtDiameter(r.extinction_diameter_mm))
                        : <span className="dim" title="Shown only when the outcome was extinction">n/a</span>}
                    </td>
                    <td className="r num">{r.burning_rate_mm2_s == null ? <span className="nodata">No data</span> : fmtRate(r.burning_rate_mm2_s)}</td>
                    <td><QcChips flags={r.qc_flags} /></td>
                    <td><Doi doi={r.source_doi} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <nav className="table-foot" aria-label="Table pages">
            <span className="num">Rows {safePage * PAGE + 1}–{safePage * PAGE + view.length} · page {safePage + 1} of {pages}</span>
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
        </p>
      </div>
    </Section>
  );
}
