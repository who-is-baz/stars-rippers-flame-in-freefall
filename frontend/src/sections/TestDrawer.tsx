// Detail panel for one test: every field, source DOI, flags, AI label, "Why relevant" and "What this test cannot tell us".
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ExperimentRow } from '../data/types';
import { Badge, Doi, QcChips } from '../components/ui';
import { fmtDiameter, fmtGas, fmtO2, fmtPressure, fmtRate } from '../lib/format';
import { outcomeLabel } from '../lib/honesty';
import { isComplete } from '../lib/indicators';
import { cannotTell, whyRelevant } from '../lib/experimentsView';
import type { Ranked } from '../lib/relevance';

export function TestDrawer({ ranked, atmosphere, onClose }: { ranked: Ranked; atmosphere: string; onClose: () => void }) {
  const r: ExperimentRow = ranked.row;
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { close.current?.focus(); }, [r.test_id, r.program]);
  const fields: [string, React.ReactNode][] = [
    ['Investigation', r.program], ['Test ID', <span className="mono">{r.test_id}</span>], ['Date', r.date],
    ['Fuel / material', r.material_or_fuel], ['Material category', r.material_category || '—'],
    ['Oxygen', fmtO2(r.o2_fraction)], ['Pressure', fmtPressure(r.pressure_atm)],
    ['CO₂ / He', <>{fmtGas(r.co2_fraction, 'CO₂')} · {fmtGas(r.he_fraction, 'He')}</>],
    ['Outcome', <>{outcomeLabel(r.outcome)}{r.outcome_source === 'ai_extracted' && <> <Badge tone="info" title="Outcome read from free-text notes by AI; pending human review">AI-extracted</Badge></>}</>],
    ['Outcome source', r.outcome_source],
    ['Extinction diameter', r.outcome === 'extinction' ? (r.extinction_diameter_mm == null ? 'No data available' : fmtDiameter(r.extinction_diameter_mm)) : 'n/a (outcome was not extinction)'],
    ['Burning rate', r.burning_rate_mm2_s == null ? 'No data available' : fmtRate(r.burning_rate_mm2_s)],
    ['Record', isComplete(r) ? 'Complete' : 'Partial'], ['QC flags', <QcChips flags={r.qc_flags} />], ['Source', <Doi doi={r.source_doi} />],
  ];
  return (
    <aside className="glass test-drawer" role="dialog" aria-modal="false" aria-label="Test details" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>{r.program} · <span className="mono">{r.test_id}</span></h3>
        <button ref={close} type="button" className="icon-btn" aria-label="Close test details" onClick={onClose}><X size={14} aria-hidden="true" /></button>
      </header>
      <dl className="drawer-fields">
        {fields.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
      </dl>
      <section aria-label="Why relevant"><h4>Why relevant</h4><ul className="interp-list num">{whyRelevant(ranked, atmosphere).map((l) => <li key={l}>{l}</li>)}</ul></section>
      <section aria-label="What this test cannot tell us"><h4>What this test cannot tell us</h4><ul className="interp-list">{cannotTell(r).map((l) => <li key={l}>{l}</li>)}</ul></section>
    </aside>
  );
}
