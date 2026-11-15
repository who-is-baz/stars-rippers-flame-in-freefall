import { useMemo, useState } from 'react';
import { Download, Table2, X } from 'lucide-react';
import type { ExperimentRow, Outcome } from '../data/types';
import { useExperiments, useMeta } from '../data/useData';
import type { Location } from '../app/routes';
import { AiBadge, NCount, Panel, SourceChip, Warn } from '../components/kit';
import { fmtBand, fmtDiameter, fmtGas, fmtO2, fmtPressure, fmtRate } from '../lib/format';
import { DISRUPTION_NOTE, flagLabel, needsAiBadge, outcomeLabel } from '../lib/honesty';
import { o2BandOf, pressureLevelOf, rowKey, suppressantOf } from '../lib/filters';
import u from '../components/ui.module.css';
import s from './Explorer.module.css';

const PAGE = 50;
const KEYS = ['program', 'fuel', 'material', 'outcome', 'o2_band', 'pressure', 'suppressant', 'ids', 'q'] as const;
type Key = (typeof KEYS)[number];
type Filters = Record<Key, string>;
const OUTCOMES: (Outcome | 'not_stated')[] = ['extinction', 'disruption', 'completion', 'blowoff', 'no_ignition', 'not_sustained', 'not_stated'];

function toCsv(rows: ExperimentRow[], cols: string[]): string {
  const esc = (v: unknown) => {
    const t = Array.isArray(v) ? v.join(';') : v == null ? '' : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc((r as unknown as Record<string, unknown>)[c])).join(','))].join('\n');
}

export function Explorer({ loc }: { loc: Location }) {
  const meta = useMeta(), exp = useExperiments();
  const [f, setF] = useState<Filters>(() => Object.fromEntries(KEYS.map((k) => [k, loc.params.get(k) ?? ''])) as Filters);
  const [page, setPage] = useState(0);

  const set = (k: Key, v: string) => {
    const next = { ...f, [k]: v };
    if (k === 'program') { next.fuel = ''; next.material = ''; next.suppressant = ''; }
    setF(next); setPage(0);
    const p = new URLSearchParams(Object.entries(next).filter(([, x]) => x) as [string, string][]);
    history.replaceState(null, '', `#/explorer${p.toString() ? `?${p}` : ''}`);
  };

  const materials = useMemo(() => [...new Set(exp.items.filter((r) => r.program === 'BASS-II').map((r) => r.material_category))].sort(), [exp.items]);
  const ids = f.ids ? new Set(f.ids.split(',')) : null;
  const q = f.q.trim().toLowerCase();
  const rows = exp.items.filter((r) =>
    (!f.program || r.program === f.program) &&
    (!f.fuel || (r.program === 'FLEX' && r.material_or_fuel === f.fuel)) &&
    (!f.material || r.material_category === f.material) &&
    (!f.outcome || (f.outcome === 'not_stated' ? r.outcome_source === 'not_stated' : r.outcome === f.outcome)) &&
    (!f.o2_band || o2BandOf(r.o2_fraction, meta) === f.o2_band) &&
    (!f.pressure || (f.pressure === 'none' ? r.pressure_atm == null : pressureLevelOf(r.pressure_atm, meta) === f.pressure)) &&
    (!f.suppressant || suppressantOf(r) === f.suppressant) &&
    (!ids || ids.has(r.test_id)) &&
    (!q || r.test_id.toLowerCase().includes(q) || r.material_or_fuel.toLowerCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const active = KEYS.filter((k) => f[k]).length;

  const download = () => {
    const blob = new Blob([toCsv(rows, exp.columns)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'flame-in-freefall-tests.csv'; a.click();
    URL.revokeObjectURL(a.href);
  };

  const sel = (k: Key, label: string, opts: [string, string][]) => (
    <label className={s.field}>
      <span>{label}</span>
      <select value={f[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">All</option>
        {opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );

  return (
    <div className={u.view}>
      <header className={u.head}>
        <h1 className={u.h1}>Browse every test</h1>
        <p className={u.lead}>One row per test, exactly as recorded, with its source. Filter, then export what you see as CSV.</p>
      </header>
      <Panel id="tbl" title="Tests" icon={<Table2 size={18} strokeWidth={1.5} />}
        footer={<><span className={u.chips}>{meta.programs.map((p) => <SourceChip key={p.source_doi} doi={p.source_doi} />)}</span><NCount n={rows.length} /></>}>
        <form className={s.filters} onSubmit={(e) => e.preventDefault()} aria-label="Filters">
          {sel('program', 'Program', meta.programs.map((p) => [p.program, `${p.program} (${p.what})`]))}
          {f.program !== 'BASS-II' && sel('fuel', 'Fuel (FLEX)', [['heptane', 'Heptane'], ['methanol', 'Methanol']])}
          {f.program !== 'FLEX' && sel('material', 'Material (BASS-II)', materials.map((m) => [m, m.replace(/_/g, ' ')]))}
          {sel('outcome', 'Outcome', OUTCOMES.map((o) => [o, o === 'not_stated' ? 'Not stated in notes' : outcomeLabel(o)]))}
          {sel('o2_band', 'O₂ band', meta.o2_bands.map((b) => [b.label, fmtBand(b.label)]))}
          {sel('pressure', 'Pressure', [...meta.pressure_levels.map((l) => [l.label, l.label] as [string, string]), ['none', 'Not recorded']])}
          {f.program !== 'BASS-II' && sel('suppressant', 'Suppressant (FLEX)', [['none', 'None'], ['co2', 'CO₂ added'], ['he', 'Helium added']])}
          <label className={s.field}><span>Search ID or material</span>
            <input type="search" value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="e.g. 209F001" />
          </label>
        </form>
        <div className={s.bar}>
          <p aria-live="polite" className={u.read}><strong>{rows.length}</strong> of {exp.total} tests{active ? ` · ${active} filter${active > 1 ? 's' : ''}` : ''}</p>
          {ids && <button type="button" className={u.btn} onClick={() => set('ids', '')}><X size={14} aria-hidden="true" /> Selected list ({ids.size} IDs)</button>}
          {active > 0 && <button type="button" className={u.btn} onClick={() => { setF(Object.fromEntries(KEYS.map((k) => [k, ''])) as Filters); history.replaceState(null, '', '#/explorer'); }}>Clear filters</button>}
          <button type="button" className={u.btn} onClick={download} disabled={rows.length === 0}><Download size={14} aria-hidden="true" /> Export CSV</button>
        </div>
        {f.outcome === 'not_stated' && <Warn>“Not stated in notes” does not mean the flame did not go out.</Warn>}
        {rows.length === 0 ? (
          <p className={u.read}>No tests match these filters. Remove one to see more.</p>
        ) : (
          <div className={s.scroll} tabIndex={0} role="region" aria-label="Test table">
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Test</th><th scope="col">Fuel / material</th><th scope="col">O₂</th><th scope="col">Pressure</th>
                  <th scope="col">CO₂ / He</th><th scope="col">Outcome</th><th scope="col">Burning rate</th><th scope="col">Extinction diameter</th>
                  <th scope="col">Data-quality notes</th><th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={rowKey(r, page * PAGE + i)}>
                    <th scope="row"><span className={s.id}>{r.test_id}</span><span className={u.dim}>{r.program} · {r.date}</span></th>
                    <td>{r.program === 'FLEX' ? <span className={s.fuel}><span style={{ background: `var(--fuel-${r.material_or_fuel})` }} aria-hidden="true" />{r.material_or_fuel}</span> : r.material_or_fuel}</td>
                    <td>{fmtO2(r.o2_fraction)}{r.program === 'BASS-II' && <span className={u.dim}> measured</span>}</td>
                    <td>{fmtPressure(r.pressure_atm)}</td>
                    <td>{r.program === 'FLEX' ? `${fmtGas(r.co2_fraction, 'CO₂')} / ${fmtGas(r.he_fraction, 'He')}` : <span className={u.dim}>{fmtGas(r.co2_fraction, 'CO₂')} measured</span>}</td>
                    <td>
                      <span className={r.outcome_source === 'not_stated' ? s.notStated : undefined} title={r.outcome === 'disruption' ? DISRUPTION_NOTE : undefined}>
                        {outcomeLabel(r.outcome)}{r.outcome === 'disruption' && ' *'}
                      </span>
                      {needsAiBadge(r) && <> <AiBadge /></>}
                      {r.low_confidence_warning && <span className={s.lc}>⚠ Low confidence</span>}
                    </td>
                    <td>{r.burning_rate_mm2_s == null ? <span className={u.dim}>Not recorded</span> : fmtRate(r.burning_rate_mm2_s)}</td>
                    <td>{r.extinction_diameter_mm == null ? <span className={u.dim}>Not recorded</span> : fmtDiameter(r.extinction_diameter_mm)}</td>
                    <td>{r.qc_flags.length ? <ul className={u.flags}>{r.qc_flags.map((fl) => <li key={fl}>{flagLabel(fl)}</li>)}</ul> : <span className={u.dim}>None</span>}</td>
                    <td><SourceChip doi={r.source_doi} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={u.dim}>* Disruption: {DISRUPTION_NOTE}.</p>
        {pages > 1 && (
          <nav aria-label="Table pages" className={s.pager}>
            <button type="button" className={u.btn} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className={u.dim}>Rows {page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}</span>
            <button type="button" className={u.btn} disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        )}
      </Panel>
    </div>
  );
}
