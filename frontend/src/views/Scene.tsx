// Escena 2D estática (SVG): sin 3D, sin rotar ni zoom. La llama solo usa criteria.o2 y criteria.pressure_psi.
import type { Scenario } from '../data/types';
import { fmtCriterionO2, fmtCriterionP } from '../lib/scenario';
import s from './Scene.module.css';

export function Scene({ scenario }: { scenario: Scenario }) {
  const o2 = Math.min(scenario.criteria.o2.value, 0.4) / 0.4; // más O₂ → llama más grande y brillante (ilustrativo)
  const psi = Math.min(scenario.criteria.pressure_psi.value, 14.7) / 14.7; // más presión → borde más definido
  const scale = 0.45 + 0.55 * o2;
  const blur = (1 - psi) * 7 + 1;
  const hypothetical = scenario.n_exact === 0;
  return (
    <figure className={s.fig}>
      <svg viewBox="0 0 400 360" role="img" aria-labelledby="scene-t scene-d" className={s.svg}>
        <title id="scene-t">Illustration of a spherical droplet flame in microgravity</title>
        <desc id="scene-d">
          {`Flame drawn for ${scenario.label}: ${fmtCriterionO2(scenario)}, ${fmtCriterionP(scenario)}. Size and edge are illustrative only.`}
          {hypothetical ? ' Hypothetical: no test was run exactly at this air.' : ''}
        </desc>
        <defs>
          <radialGradient id="flame" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--flame-core)" stopOpacity=".0" />
            <stop offset="62%" stopColor="var(--flame-core)" stopOpacity=".08" />
            <stop offset="84%" stopColor="var(--flame-blue)" stopOpacity=".85" />
            <stop offset="100%" stopColor="var(--flame-blue)" stopOpacity="0" />
          </radialGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={blur} /></filter>
        </defs>
        {/* cámara */}
        <circle cx="200" cy="180" r="160" fill="none" stroke="var(--graphite-5)" strokeWidth="1.5" />
        <circle cx="200" cy="180" r="148" fill="none" stroke="var(--graphite-7)" strokeWidth="6" />
        {/* llama */}
        <g className={s.flame} style={{ transform: `translate(200px,180px) scale(${scale})`, opacity: 0.55 + 0.45 * o2 }}>
          <circle r="120" fill="url(#flame)" filter="url(#soft)" />
          {hypothetical && <circle r="120" fill="none" stroke="var(--silver)" strokeDasharray="4 6" strokeWidth={1.5 / scale} />}
        </g>
        {/* fibra y gota */}
        <line x1="40" y1="180" x2="360" y2="180" stroke="var(--silver)" strokeOpacity=".35" strokeWidth="1" />
        <circle cx="200" cy="180" r="9" fill="var(--graphite-8)" stroke="var(--ember)" strokeOpacity=".7" />
        {/* anotaciones */}
        <g className={s.note}>
          <line x1="207" y1="186" x2="270" y2="300" stroke="var(--ink-dim)" />
          <text x="274" y="312">Fuel droplet on a fiber</text>
          <line x1="140" y1="120" x2="70" y2="50" stroke="var(--ink-dim)" />
          <text x="20" y="40">{hypothetical ? 'Flame shell (hypothetical)' : 'Flame shell'}</text>
        </g>
      </svg>
      <figcaption className={s.cap}>Illustration. Not a combustion simulation. Flame size follows the O₂ target only for orientation.</figcaption>
    </figure>
  );
}
