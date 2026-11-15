import { Layers } from 'lucide-react';
import type { MaterialGroup, Outcome } from '../data/types';
import { useMaterials } from '../data/useData';
import { AiBadge, NCount, Panel, SmallN, SourceChip, Warn } from '../components/kit';
import { fmtO2Range } from '../lib/format';
import { flagLabel, outcomeLabel } from '../lib/honesty';
import u from '../components/ui.module.css';
import s from './Materials.module.css';

// BASS-II: solo "Shown to burn" o "Undetermined"; nunca un %, nunca "non-flammable"; not_stated punteado y aparte.
const CLASS_LABEL = { flammable_demonstrated: 'Shown to burn', undetermined: 'Undetermined — no stated outcome' } as const;
const OUT_COLOR: Partial<Record<Outcome, string>> = {
  extinction: 'var(--out-extinction)', blowoff: 'var(--out-blowoff)', no_ignition: 'var(--out-noflame)', not_sustained: 'var(--out-noflame)',
};

function Counts({ g }: { g: MaterialGroup }) {
  const entries = Object.entries(g.n_by_outcome) as [Outcome, number][];
  return (
    <ul className={u.bars}>
      {entries.map(([o, n]) => (
        <li key={o} className={u.bar}>
          <span>{outcomeLabel(o)}</span>
          <span className={u.track}><span className={u.fill} style={{ width: `${(n / g.n) * 100}%`, background: OUT_COLOR[o] ?? 'var(--silver)' }} /></span>
          <span className={u.dim}>{n}</span>
        </li>
      ))}
      <li className={u.bar}>
        <span>Not stated in notes</span>
        <span className={u.track}><span className={`${u.fill} ${s.dotted}`} style={{ width: `${(g.n_not_stated / g.n) * 100}%` }} /></span>
        <span className={u.dim}>{g.n_not_stated}</span>
      </li>
    </ul>
  );
}

export function Materials() {
  const m = useMaterials();
  return (
    <div className={u.view}>
      <header className={u.head}>
        <h1 className={u.h1}>Which solid materials were shown to burn?</h1>
        <p className={u.lead}>BASS-II tests on solid samples in airflow. A material is “shown to burn” if at least one test states a flame; otherwise it stays undetermined. These data cannot show that a material does not burn.</p>
        <ul className={u.flags}>{m.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </header>
      <div className={u.grid2}>
        {m.materials.map((mat) => (
          <Panel key={mat.material_category} id={`m-${mat.material_category}`} title={mat.material_category.replace(/_/g, ' ')} icon={<Layers size={18} strokeWidth={1.5} />}
            footer={<><SourceChip doi={m.source_doi} /><NCount n={mat.n} /></>}>
            <p className={mat.classification === 'flammable_demonstrated' ? s.burn : s.undet}>{CLASS_LABEL[mat.classification]}</p>
            <p className={u.read}>{mat.n_with_outcome} of {mat.n} tests state an outcome. O₂ {fmtO2Range(mat.o2_min, mat.o2_max)}, measured in chamber.</p>
            {mat.by_color ? (
              mat.by_color.map((c) => (
                <div key={c.color} className={s.sub}>
                  <p className={u.dim}>{c.color} samples — shown separately, not averaged together · n = {c.n}</p>
                  <Counts g={c} />
                </div>
              ))
            ) : <Counts g={mat} />}
            {!mat.warning && <SmallN n={mat.n} />}
            {mat.warning && <Warn>{mat.warning}</Warn>}
            {mat.n_low_confidence > 0 && <p className={u.read}><AiBadge /> <span className={s.lc}>⚠ {mat.n_low_confidence} low-confidence extraction{mat.n_low_confidence > 1 ? 's' : ''}, pending human review</span></p>}
            {mat.qc_flags.length > 0 && (
              <details><summary className={u.dim}>Data-quality notes</summary><ul className={u.flags}>{mat.qc_flags.map((f) => <li key={f}>{flagLabel(f)}</li>)}</ul></details>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
