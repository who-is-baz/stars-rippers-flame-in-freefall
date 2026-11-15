import { ArrowDown, Sparkles } from 'lucide-react';
import { useMeta } from '../data/useData';
import { useUi } from '../state/ui';
import { MICROGRAVITY_NOTE } from '../lib/honesty';

// The three key figures are read from meta.json (n_tests and programs[].n). Nothing here is typed by hand.
export function Hero() {
  const meta = useMeta();
  const { openAssistant } = useUi();
  const stats = [
    { n: meta.n_tests, label: 'microgravity combustion tests in this dashboard', src: `meta.json · n_tests · ${meta.source_doi.map((d) => `doi:${d}`).join(' + ')}` },
    ...meta.programs.map((p) => ({
      n: p.n,
      label: `${p.program} (${p.psi_id}): ${p.what}${p.program === 'BASS-II' ? ' · context only' : ''}`,
      src: `meta.json · programs · doi:${p.source_doi}`,
    })),
  ];
  return (
    <header className="hero" id="top">
      <div className="hero-in">
        <span className="eyebrow">Stars Rippers · NASA Space Apps Challenge 2026</span>
        <h1>Flame in Freefall</h1>
        <p className="hero-lead">
          A sourced view of what NASA&rsquo;s open microgravity combustion tests observed, organised by atmosphere
          (oxygen and pressure), and an equally clear view of what they do not cover.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary btn-lg" href="#scenarios">Explore the scenarios <ArrowDown size={16} aria-hidden="true" /></a>
          <button type="button" className="btn btn-lg" onClick={() => openAssistant()}>
            <Sparkles size={16} aria-hidden="true" /> Ask the SI Assistant
          </button>
        </div>
        <ul className="stats" aria-label="Key figures" style={{ listStyle: 'none', padding: 0 }}>
          {stats.map((s) => (
            <li key={s.src} className="stat glass">
              <p className="stat-n num">{s.n}</p>
              <p className="stat-l">{s.label}</p>
              <p className="stat-src mono">{s.src}</p>
            </li>
          ))}
        </ul>
        <p className="hero-note">
          {MICROGRAVITY_NOTE} This page shows what was observed in the tested conditions. It contains no predictive model
          and makes no safety claims. Data: NASA Physical Sciences Informatics (PSI), {meta.license}.
        </p>
      </div>
    </header>
  );
}
