// Three small instruments under the camera: oxygen, pressure and airflow. Values come from the selected scenario or the Custom
// controls. Airflow is a measured range only when the matching tests have one (BASS-II air speed, AI-extracted); otherwise it is
// labelled conceptual. Conceptual illustration: not a physical simulation.
import { useMemo } from 'react';
import { useData } from '../data/useData';
import { useActiveAtmosphere } from '../state/atmosphere';
import { O2_REFERENCE, PSI_REFERENCE, airflowFor, clamp01, critText, pressureScaleMax } from '../lib/instruments';
import { fmtPsiAtm } from '../lib/format';

export const AIRFLOW_NOTE = 'Not a measured variable in the matching tests';

function Meter({ label, value, extra, fill, refAt, refLabel }: { label: string; value: string; extra?: string; fill: number; refAt: number; refLabel: string }) {
  return (
    <div className="inst" role="group" aria-label={`${label}: ${value}`}>
      <div className="inst-head"><span>{label}</span><b className="num">{value}</b></div>
      <div className="inst-track" aria-hidden="true">
        <i className="inst-fill" style={{ width: `${(clamp01(fill) * 100).toFixed(1)}%` }} />
        <i className="inst-ref" style={{ left: `${(clamp01(refAt) * 100).toFixed(1)}%` }} />
      </div>
      <div className="inst-foot num"><span>{refLabel}</span>{extra && <span>{extra}</span>}</div>
    </div>
  );
}

export function SceneInstruments() {
  const d = useData();
  const atm = useActiveAtmosphere();
  const rows = d.experiments.items;
  const psiMax = useMemo(() => pressureScaleMax(rows), [rows]);
  const flow = useMemo(() => (atm ? airflowFor(rows, d.airflow, atm, d.meta) : { kind: 'conceptual' as const }), [rows, d.airflow, atm, d.meta]);
  if (!atm) return null;
  return (
    <section className="scene-instruments dark-zone" aria-label="Scene instruments (conceptual illustration)">
      <Meter label="Oxygen" value={`${critText(atm.o2, 'o2')} O₂`} fill={atm.o2.value} refAt={O2_REFERENCE} refLabel="Earth air 21%" />
      <Meter label="Pressure" value={fmtPsiAtm(atm.pressure_psi.value).replace(/^/, atm.pressure_psi.kind === 'max' ? '≤' : atm.pressure_psi.kind === 'min' ? '≥' : '')}
        fill={atm.pressure_psi.value / psiMax} refAt={PSI_REFERENCE / psiMax} refLabel="Earth 14.7 psi" />
      <div className="inst" role="group" aria-label={flow.kind === 'measured' ? `Airflow ${flow.min} to ${flow.max} ${flow.unit}` : `Airflow (conceptual). ${AIRFLOW_NOTE}`}>
        <div className="inst-head"><span>{flow.kind === 'measured' ? 'Airflow' : 'Airflow (conceptual)'}</span>
          <b className="num">{flow.kind === 'measured' ? (flow.min === flow.max ? `${flow.min} ${flow.unit}` : `${flow.min}–${flow.max} ${flow.unit}`) : '—'}</b></div>
        <div className={`inst-flow${flow.kind === 'measured' ? '' : ' is-concept'}`} aria-hidden="true"><i /><i /><i /></div>
        <div className="inst-foot num"><span>
          {flow.kind === 'measured' ? `BASS-II, n = ${flow.n} of ${flow.nMatched} tests at this O₂ · AI-extracted` : AIRFLOW_NOTE}
        </span></div>
      </div>
    </section>
  );
}
