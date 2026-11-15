import { useState } from 'react';
import { ArrowUpRight, Compass, Flame, HelpCircle, Info, Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import type { Fuel, Scenario } from '../data/types';
import { useCoverage, useGaps, useMaterials, useMeta, useScenarios } from '../data/useData';
import { useUi, type BoardCardType } from '../state/ui';
import { Badge, Doi } from '../components/ui';
import { FlameScene } from '../components/FlameScene';
import {
  BurningRateChartSvg,
  CoverageRadarSvg,
  KpiRingSvg,
  MatchRingSvg,
  OutcomeBarsSvg,
  OutcomePills,
} from '../components/charts';
import { fmtTolerance, fmtCriterionO2, fmtCriterionP } from '../lib/scenario';
import { isSmallN, MICROGRAVITY_NOTE } from '../lib/honesty';

const SHORT_NAME: Record<Scenario['id'], string> = {
  earth_iss: 'Earth / ISS',
  lunar_challenge: 'Moon base',
  lunar_nasa: 'NASA lunar habitat',
  exploration: 'Exploration atmosphere',
  suit: 'Spacesuit',
};

const SUBTITLE_NAME: Record<Scenario['id'], string> = {
  earth_iss: 'Sea-level & ISS reference',
  lunar_challenge: 'Challenge estimate',
  lunar_nasa: 'Nominal habitat spec',
  exploration: '8.2 psia · 34% O₂',
  suit: 'EVA suit criteria',
};

const GALLERY_ITEMS: {
  type: BoardCardType;
  cat: 'Start here' | 'Compare' | 'Coverage & gaps' | 'Raw tests';
  title: string;
  sub: string;
}[] = [
  {
    type: 'burning_rate_line',
    cat: 'Compare',
    title: 'Does more oxygen make fuel burn faster?',
    sub: 'Line · FLEX · PSI-69',
  },
  {
    type: 'outcomes_bars',
    cat: 'Start here',
    title: 'How did those tests end?',
    sub: 'Bars · FLEX · PSI-69',
  },
  {
    type: 'coverage_heatmap',
    cat: 'Coverage & gaps',
    title: 'Which conditions were tested?',
    sub: 'Radar · FLEX · PSI-69',
  },
  {
    type: 'materials_bars',
    cat: 'Compare',
    title: 'Which solid materials were shown to burn?',
    sub: 'Counts · BASS-II · PSI-25',
  },
  {
    type: 'tests_scatter',
    cat: 'Raw tests',
    title: 'Browse the 403 individual tests',
    sub: 'Table · FLEX + BASS-II',
  },
];

function MiniFlameThumb({ o2 }: { o2: number }) {
  const r = Math.min(23, Math.max(14, Math.round(13 + o2 * 20)));
  return (
    <div className="thumb" aria-hidden="true">
      <svg width="54" height="54" viewBox="0 0 54 54">
        <defs>
          <radialGradient id="miniFlameGrad">
            <stop offset="0" stopColor="#F7F9FF" />
            <stop offset="0.4" stopColor="#7C96FF" />
            <stop offset="1" stopColor="#26324F" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="27" cy="27" r={r} fill="url(#miniFlameGrad)" />
        <circle cx="27" cy="27" r="2.6" fill="#0b0e14" stroke="#E6EAF0" strokeWidth="0.6" />
      </svg>
    </div>
  );
}

export function Hero() {
  const meta = useMeta();
  const { scenarios } = useScenarios();
  const coverage = useCoverage();
  const { gaps } = useGaps();
  const materials = useMaterials();
  const {
    showTests,
    openAssistant,
    scenarioId: ctxScenarioId,
    setScenarioId: ctxSetScenarioId,
    mode = 'explorer',
    customizeOpen = false,
    setCustomizeOpen,
    extraCard,
    setExtraCard,
  } = useUi();

  const [localScenarioId, setLocalScenarioId] = useState<Scenario['id']>('lunar_challenge');
  const activeId = ctxScenarioId ?? localScenarioId;
  const selectScenario = (id: Scenario['id']) => {
    setLocalScenarioId(id);
    ctxSetScenarioId?.(id);
  };

  const [introOpen, setIntroOpen] = useState(true);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [chartView, setChartView] = useState<'bars' | 'line'>('bars');
  const [radarFuel, setRadarFuel] = useState<Fuel>('heptane');
  const [dockTab, setDockTab] = useState<'scenarios' | 'investigations'>('scenarios');
  const [infoCard, setInfoCard] = useState<string | null>(null);
  const [galleryCat, setGalleryCat] = useState<string>('All');
  const [galleryQuery, setGalleryQuery] = useState('');

  const currentIdx = Math.max(
    0,
    scenarios.findIndex((s) => s.id === activeId),
  );
  const current = scenarios[currentIdx] ?? scenarios[0];
  const tol = fmtTolerance(meta.tolerance);

  // Derived real counts from JSON files (no invented numbers)
  const flexProg = meta.programs.find((p) => p.program === 'FLEX');
  const bassProg = meta.programs.find((p) => p.program === 'BASS-II');
  const bassStated = materials.materials.reduce((s, m) => s + m.n_with_outcome, 0);
  const flexCellsTested = coverage.n_cells - coverage.n_cells_empty;
  const radarFuelCells = coverage.cells.filter((c) => c.fuel === radarFuel);
  const radarFuelTested = radarFuelCells.filter((c) => c.n > 0).length;

  // Count how many 1.0 atm burning-rate points have n < min_n
  const smallRatePoints = coverage.cells.filter(
    (c) => c.pressure_level === '~1.0 atm' && c.n_burning_rate > 0 && isSmallN(c.n_burning_rate, meta.min_n),
  ).length;

  const stats = [
    {
      n: meta.n_tests,
      label: 'microgravity combustion tests in this dashboard',
      src: `meta.json · n_tests · ${meta.source_doi.map((d) => `doi:${d}`).join(' + ')}`,
    },
    ...meta.programs.map((p) => ({
      n: p.n,
      label: `${p.program} (${p.psi_id}): ${p.what}${p.program === 'BASS-II' ? ' · context only' : ''}`,
      src: `meta.json · programs · doi:${p.source_doi}`,
    })),
  ];

  const matchReading = () => {
    if (current.n_exact > 0) {
      return `${current.n_exact} FLEX tests match within ${tol}.`;
    }
    if (current.n_near > 0) {
      return `No FLEX test sits exactly at ${fmtCriterionO2(current)} and ${fmtCriterionP(
        current,
      )}; ${current.n_near} are within ${tol}.`;
    }
    return `No FLEX test matches this atmosphere, even within ${tol}.`;
  };

  const scrollTo = (hash: string) => {
    const el = document.querySelector(hash);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredGallery = GALLERY_ITEMS.filter(
    (g) =>
      (galleryCat === 'All' || g.cat === galleryCat) &&
      (!galleryQuery.trim() || g.title.toLowerCase().includes(galleryQuery.toLowerCase())),
  );

  return (
    <header className="console-section" id="top">
      <div className={`console-frame${customizeOpen ? ' is-editing' : ''}`}>
        {/* Full-bleed interactive microgravity combustion scene */}
        {current && <FlameScene scenario={current} mode={mode} />}

        {/* Edit-mode dot grid overlay */}
        {customizeOpen && <div className="grid-overlay" aria-hidden="true" />}

        {/* Top right NASA CC0 non-endorsement notice */}
        <span className="console-credit">
          Uses NASA PSI open data ({meta.license}). Not endorsed by NASA.
        </span>

        {/* Toast when a card is added by SI or user */}
        {extraCard && (
          <div className="glass console-toast" role="status" aria-live="polite">
            <span>
              {extraCard.addedBy === 'si' ? 'Card added by SI' : 'Card added to board'}:{' '}
              <strong>{extraCard.title}</strong>
            </span>
            <button type="button" className="toast-undo" onClick={() => setExtraCard?.(null)}>
              <RotateCcw size={12} aria-hidden="true" /> Undo
            </button>
          </div>
        )}

        {/* Left Edge Vertical SI Assistant Tab */}
        <button
          type="button"
          className="glass sitab"
          onClick={() => openAssistant()}
          aria-label="Open SI assistant"
        >
          <Sparkles size={15} color="var(--mint)" aria-hidden="true" />
          <span>SI assistant</span>
        </button>

        {/* ==================== ZONE A: LEFT RAIL ==================== */}
        <aside className="console-left" aria-label="SI insights and key questions">
          <div className="rail-header">
            <span className="rail-eyebrow">
              <Sparkles size={13} color="var(--mint)" aria-hidden="true" /> SI insights
            </span>
            {!introOpen && (
              <button
                type="button"
                className="icon-btn"
                title="Show introduction"
                aria-label="Show introduction"
                onClick={() => setIntroOpen(true)}
              >
                <HelpCircle size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          {introOpen && (
            <div className="intro-block">
              <h1>Fire behaves differently in space.</h1>
              <p>
                Explore <strong className="num">{meta.n_tests}</strong> NASA fire tests run on the ISS and see what
                they say about spacecraft and Moon-base air.
              </p>
              <div className="row" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setTourStep(1)}
                >
                  <Compass size={13} aria-hidden="true" /> Take the 30-s tour
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIntroOpen(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Card 1: Scenario Match Ring ("Near Moon-base air" / "How many tests match this air?") */}
          {current && (
            <article className="glass wc">
              {customizeOpen && <span className="drag-handle" aria-hidden="true" />}
              <div className="wc-hd">
                <span className="wc-icon" aria-hidden="true">
                  <Flame size={13} />
                </span>
                <h2>
                  {current.id === 'lunar_challenge'
                    ? 'Near Moon-base air'
                    : `How many tests match ${SHORT_NAME[current.id]}?`}
                </h2>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="How to read this card"
                  aria-expanded={infoCard === 'match'}
                  onClick={() => setInfoCard(infoCard === 'match' ? null : 'match')}
                >
                  <Info size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Open scenario details"
                  onClick={() => scrollTo('#scenarios')}
                >
                  <ArrowUpRight size={13} aria-hidden="true" />
                </button>
              </div>

              {infoCard === 'match' ? (
                <p className="wc-read">
                  {mode === 'engineer'
                    ? `Counts FLEX droplet tests against scenario criteria with tolerance ${tol}. Exact matches meet nominal bounds; near matches relax bounds by 1 tolerance.`
                    : `Compares each ISS fire test against this atmosphere. Because sensors vary slightly, we check both exact matches and tests within ${tol}.`}
                </p>
              ) : (
                <>
                  <div className="ring-row">
                    <MatchRingSvg
                      exact={current.n_exact}
                      near={current.n_near}
                      total={flexProg?.n ?? 274}
                      minN={meta.min_n}
                    />
                    <div>
                      <div className="wc-big num">
                        {current.n_near} <small>{current.n_exact > 0 ? 'within tolerance' : 'near'}</small>
                      </div>
                      <div className="dim num" style={{ fontSize: 'var(--fs-sm)' }}>
                        {current.n_exact} exact {current.n_exact === 1 ? 'match' : 'matches'}
                      </div>
                    </div>
                  </div>
                  <p className="wc-read">{matchReading()}</p>
                </>
              )}

              <div className="wc-ft num">
                <span className="src-pill">
                  FLEX · {flexProg?.psi_id ?? 'PSI-69'} · <Doi doi={current.source_doi} />
                </span>
                <span>n = {current.n_near || current.n_exact}</span>
              </div>
            </article>
          )}

          {/* Card 2: Burning rate by O₂ band (Bars + Line toggle, driven by coverage.json) */}
          <article className="glass wc">
            {customizeOpen && <span className="drag-handle" aria-hidden="true" />}
            <div className="wc-hd">
              <h2>Burning rate by O₂ band</h2>
              <div className="mini-seg" role="group" aria-label="Chart type">
                <button
                  type="button"
                  aria-pressed={chartView === 'bars'}
                  onClick={() => setChartView('bars')}
                >
                  Bars
                </button>
                <button
                  type="button"
                  aria-pressed={chartView === 'line'}
                  onClick={() => setChartView('line')}
                >
                  Line
                </button>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Open fuel comparison"
                onClick={() => scrollTo('#fuels')}
              >
                <ArrowUpRight size={13} aria-hidden="true" />
              </button>
            </div>

            <div className="chart-key">
              <span>
                <b style={{ background: 'var(--fuel-heptane)' }} /> Heptane
              </span>
              <span>
                <b style={{ background: 'var(--fuel-methanol)' }} /> Methanol
              </span>
              <span className="mono">~1.0 atm</span>
            </div>

            <BurningRateChartSvg
              cells={coverage.cells}
              bands={meta.o2_bands}
              pressureLevel="~1.0 atm"
              metric="rate"
              mode={chartView}
              minN={meta.min_n}
              compact
            />

            <p className="wc-read">
              {mode === 'engineer'
                ? 'Mean burning-rate constant K (mm²/s) at ~1.0 atm from coverage.json. Descriptive; suppressants mixed.'
                : 'At ~1.0 atm, both fuels burn faster as oxygen increases. Descriptive; suppressants mixed.'}
            </p>
            <div className="wc-ft num">
              <span className="src-pill">FLEX · {flexProg?.psi_id ?? 'PSI-69'}</span>
              {smallRatePoints > 0 && (
                <span style={{ color: 'var(--caution)' }}>
                  ⚠ {smallRatePoints} points with n &lt; {meta.min_n}
                </span>
              )}
            </div>
          </article>

          {/* Card 3: Striped No-Data Gap Card ("∅ No lunar-gravity fire data") */}
          <article className="glass wc wc-nodata">
            <div className="wc-hd">
              <h2>∅ No lunar-gravity fire data</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="See all gaps and limitations"
                onClick={() => scrollTo('#gaps')}
              >
                <ArrowUpRight size={13} aria-hidden="true" />
              </button>
            </div>
            <p className="wc-read" style={{ marginTop: 0 }}>
              {MICROGRAVITY_NOTE} {gaps[0]?.text}
            </p>
            <div className="wc-ft num">
              <span className="src-pill">PSI-69 · PSI-25</span>
              <a href="#gaps" className="wc-link">
                {gaps.length} gaps · See all
              </a>
            </div>
          </article>

          {customizeOpen && (
            <button
              type="button"
              className="slot-btn"
              onClick={() =>
                setExtraCard?.({
                  type: 'outcomes_bars',
                  addedBy: 'user',
                  title: 'How did those tests end?',
                })
              }
            >
              + Add card
            </button>
          )}
        </aside>

        {/* ==================== ZONE B: RIGHT RAIL ==================== */}
        {!customizeOpen && current && (
          <aside className="console-right" aria-label="Scenario inspector and coverage radar">
            {/* Inspector Card: Scenario 0X of 05 */}
            <section className="glass wc inspector-card" aria-label="Selected scenario inspector">
              <div className="wc-hd">
                <h2>Scenario</h2>
                <span className="mono dim" style={{ fontSize: 'var(--fs-xs)' }}>
                  0{currentIdx + 1} of 0{scenarios.length}
                </span>
              </div>

              <div className="insp-head">
                <MiniFlameThumb o2={current.criteria.o2.value} />
                <div>
                  <h3>{SHORT_NAME[current.id] ?? current.label}</h3>
                  <small>{SUBTITLE_NAME[current.id] ?? current.label}</small>
                  {!current.verified && (
                    <div style={{ marginTop: 4 }}>
                      <Badge tone="caution">Unverified source</Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="insp-kv num">
                <div>
                  <span>O₂</span>
                  <b>{fmtCriterionO2(current).replace(' O₂', '')}</b>
                </div>
                <div>
                  <span>Pressure</span>
                  <b>{fmtCriterionP(current)}</b>
                </div>
                <div>
                  <span>Earth, for comparison</span>
                  <b>21% · 14.7 psi</b>
                </div>
                <div>
                  <span>Exact matches</span>
                  <b>{current.n_exact} tests</b>
                </div>
                <div>
                  <span>Within tolerance</span>
                  <b className={current.n_near === 0 ? 'warn-text' : undefined}>
                    {current.n_near} tests
                  </b>
                </div>
              </div>

              <OutcomePills
                outcomes={
                  current.n_near > 0
                    ? current.near.n_by_outcome
                    : current.nearest?.n_by_outcome
                }
              />

              <p className="insp-note">
                ⓘ {current.note ?? current.source}
              </p>

              {current.n_near > 0 && current.near.test_ids ? (
                <button
                  type="button"
                  className="cta-mint"
                  onClick={() =>
                    showTests({
                      ids: current.near.test_ids,
                      label: `${SHORT_NAME[current.id]}: ${
                        current.n_exact > 0 ? 'matching' : 'near-match'
                      } tests`,
                    })
                  }
                >
                  Show {current.n_near} {current.n_exact === 0 ? 'closest ' : ''}tests
                </button>
              ) : current.nearest?.test_ids ? (
                <button
                  type="button"
                  className="cta-mint"
                  onClick={() =>
                    showTests({
                      ids: current.nearest?.test_ids,
                      label: `Closest tested condition to ${SHORT_NAME[current.id]} (not this scenario)`,
                    })
                  }
                >
                  Show {current.nearest.n} closest tests (not this scenario)
                </button>
              ) : (
                <a className="cta-mint" href="#scenarios">
                  Inspect scenario details
                </a>
              )}
            </section>

            {/* Second Right Card: Either Extra Card added by SI/Customize OR Coverage Radar */}
            {extraCard ? (
              <article className="glass wc wc-si-added">
                <div className="wc-hd">
                  <h2>{extraCard.title}</h2>
                  <span className="bysi-badge">
                    {extraCard.addedBy === 'si' ? 'Added by SI' : 'Custom card'}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Remove card"
                    onClick={() => setExtraCard?.(null)}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
                {extraCard.type === 'outcomes_bars' ? (
                  <>
                    <OutcomeBarsSvg
                      outcomes={
                        current.n_near > 0
                          ? current.near.n_by_outcome
                          : current.nearest?.n_by_outcome
                      }
                      total={current.n_near || current.nearest?.n || 0}
                      minN={meta.min_n}
                    />
                    <p className="wc-read">
                      Observed outcomes for {SHORT_NAME[current.id]}. &ldquo;Disruption&rdquo; is not defined in the FLEX Science Documents.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="chart-key">
                      <span>
                        <b style={{ background: 'var(--fuel-heptane)' }} /> Heptane
                      </span>
                      <span>
                        <b style={{ background: 'var(--fuel-methanol)' }} /> Methanol
                      </span>
                      <span className="mono">~1.0 atm</span>
                    </div>
                    <BurningRateChartSvg
                      cells={coverage.cells}
                      bands={meta.o2_bands}
                      pressureLevel="~1.0 atm"
                      metric="rate"
                      mode="line"
                      minN={meta.min_n}
                      compact
                    />
                    <p className="wc-read">
                      At ~1.0 atm, both burn faster with more oxygen. Descriptive only.
                    </p>
                  </>
                )}
                <div className="wc-ft num">
                  <span className="src-pill">FLEX · PSI-69</span>
                  <span>⚠ {smallRatePoints} points with n &lt; {meta.min_n}</span>
                </div>
              </article>
            ) : (
              <section className="glass wc radar-card" aria-label="Coverage radar">
                <div className="wc-hd">
                  <h2>Coverage radar · {radarFuel}</h2>
                  <div className="mini-seg" role="group" aria-label="Radar fuel">
                    <button
                      type="button"
                      aria-pressed={radarFuel === 'heptane'}
                      onClick={() => setRadarFuel('heptane')}
                    >
                      Hept
                    </button>
                    <button
                      type="button"
                      aria-pressed={radarFuel === 'methanol'}
                      onClick={() => setRadarFuel('methanol')}
                    >
                      Meth
                    </button>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Open full coverage map"
                    onClick={() => scrollTo('#coverage')}
                  >
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </button>
                </div>
                <p className="wc-sub num">
                  {radarFuelTested} of {radarFuelCells.length} conditions tested ·{' '}
                  <span style={{ color: 'var(--mint)' }}>{flexProg?.psi_id ?? 'PSI-69'}</span>
                </p>
                <CoverageRadarSvg
                  cells={coverage.cells}
                  fuel={radarFuel}
                  bands={meta.o2_bands}
                  pressures={meta.pressure_levels}
                  minN={meta.min_n}
                  onSelectCell={(cell) =>
                    showTests({
                      program: 'FLEX',
                      fuel: cell.fuel,
                      o2Band: cell.o2_band,
                      pressure: cell.pressure_level,
                    })
                  }
                />
              </section>
            )}
          </aside>
        )}

        {/* ==================== CUSTOMIZE GALLERY DRAWER (v3_edit.png) ==================== */}
        {customizeOpen && (
          <aside className="glass gallery-drawer" aria-label="Add a card">
            <div className="wc-hd">
              <h2>Add a card</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close customize gallery"
                onClick={() => setCustomizeOpen?.(false)}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            <label className="gallery-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={galleryQuery}
                onChange={(e) => setGalleryQuery(e.target.value)}
                placeholder="Search questions…"
                aria-label="Search card templates"
              />
            </label>
            <div className="gallery-tabs" role="group" aria-label="Card categories">
              {(['All', 'Start here', 'Compare', 'Coverage & gaps', 'Raw tests'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={galleryCat === cat ? 'on' : ''}
                  aria-pressed={galleryCat === cat}
                  onClick={() => setGalleryCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="gallery-list">
              {filteredGallery.map((item) => (
                <div key={item.type} className="gallery-item">
                  <div className="gallery-pv" aria-hidden="true">
                    {item.type === 'burning_rate_line' && (
                      <svg width="68" height="38" viewBox="0 0 70 40">
                        <polyline
                          points="5,32 20,28 35,26 50,18 65,10"
                          fill="none"
                          stroke="var(--fuel-heptane)"
                          strokeWidth="1.6"
                        />
                        <polyline
                          points="5,35 20,33 35,29 50,25 65,14"
                          fill="none"
                          stroke="var(--fuel-methanol)"
                          strokeWidth="1.6"
                        />
                      </svg>
                    )}
                    {item.type === 'outcomes_bars' && (
                      <svg width="68" height="38" viewBox="0 0 70 40">
                        <rect x="5" y="8" width="44" height="6" rx="2" fill="var(--out-disruption)" />
                        <rect x="5" y="18" width="12" height="6" rx="2" fill="var(--out-completion)" />
                        <rect x="5" y="28" width="4" height="6" rx="1" fill="var(--out-extinction)" />
                      </svg>
                    )}
                    {item.type === 'coverage_heatmap' && (
                      <svg width="68" height="38" viewBox="0 0 70 40">
                        <rect x="8" y="5" width="16" height="9" rx="2" fill="var(--cov-3)" />
                        <rect x="27" y="5" width="16" height="9" rx="2" fill="var(--cov-2)" />
                        <rect x="8" y="17" width="16" height="9" rx="2" fill="var(--cov-4)" />
                        <rect
                          x="27"
                          y="28"
                          width="16"
                          height="8"
                          rx="2"
                          fill="rgba(255,209,102,.25)"
                          stroke="var(--caution)"
                          strokeWidth="0.8"
                        />
                      </svg>
                    )}
                    {item.type === 'materials_bars' && (
                      <svg width="68" height="38" viewBox="0 0 70 40">
                        <rect x="5" y="7" width="46" height="6" rx="2" fill="var(--mint)" opacity="0.75" />
                        <rect x="5" y="18" width="28" height="6" rx="2" fill="var(--mint)" opacity="0.5" />
                        <rect
                          x="5"
                          y="29"
                          width="22"
                          height="6"
                          rx="2"
                          fill="none"
                          stroke="var(--ink-dim)"
                          strokeDasharray="2 2"
                        />
                      </svg>
                    )}
                    {item.type === 'tests_scatter' && (
                      <svg width="68" height="38" viewBox="0 0 70 40">
                        <circle cx="14" cy="28" r="2.2" fill="var(--fuel-heptane)" />
                        <circle cx="28" cy="22" r="2.2" fill="var(--fuel-heptane)" />
                        <circle cx="46" cy="14" r="2.2" fill="var(--fuel-heptane)" />
                        <circle cx="20" cy="31" r="2.2" fill="var(--fuel-methanol)" />
                        <circle cx="38" cy="25" r="2.2" fill="var(--fuel-methanol)" />
                      </svg>
                    )}
                  </div>
                  <div className="gallery-meta">
                    <b>{item.title}</b>
                    <small>{item.sub}</small>
                  </div>
                  <button
                    type="button"
                    className="gallery-add"
                    aria-label={`Add card: ${item.title}`}
                    onClick={() => {
                      if (item.type === 'tests_scatter') {
                        setCustomizeOpen?.(false);
                        scrollTo('#experiments');
                      } else if (item.type === 'materials_bars') {
                        setCustomizeOpen?.(false);
                        scrollTo('#materials');
                      } else {
                        setExtraCard?.({ type: item.type, addedBy: 'user', title: item.title });
                        setCustomizeOpen?.(false);
                      }
                    }}
                  >
                    <Plus size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <p className="dim num" style={{ fontSize: 'var(--fs-xs)', marginTop: 'auto' }}>
              {extraCard ? 5 : 4} of 9 cards on your board
            </p>
          </aside>
        )}

        {/* ==================== 30-SECOND GUIDED TOUR POPOVER ==================== */}
        {tourStep != null && (
          <div className={`tour-card step-${tourStep}`} role="dialog" aria-label="30-second guided tour">
            {tourStep === 1 && (
              <>
                <b>1 · Pick an atmosphere</b>
                <p>
                  Each card in the bottom dock is an air mixture a crew could breathe (Earth/ISS, Moon base, habitat, or suit). The spherical flame and cards update live.
                </p>
              </>
            )}
            {tourStep === 2 && (
              <>
                <b>2 · Check exact vs. near matches</b>
                <p>
                  Moon base air has 0 exact FLEX matches, but 17 tests within {tol}. Every card shows its sample size (n) and NASA PSI DOI.
                </p>
              </>
            )}
            {tourStep === 3 && (
              <>
                <b>3 · Ask the SI assistant or explore below</b>
                <p>
                  Open the SI Assistant on the left to ask questions with cited test IDs, or scroll down for the full coverage heatmap, fuel charts, and 403-row table.
                </p>
              </>
            )}
            <div className="tour-foot">
              <button type="button" className="tour-skip" onClick={() => setTourStep(null)}>
                {tourStep} of 3 · Skip
              </button>
              <button
                type="button"
                className="tour-next"
                onClick={() => setTourStep(tourStep < 3 ? tourStep + 1 : null)}
              >
                {tourStep < 3 ? 'Next' : 'Finish'}
              </button>
            </div>
          </div>
        )}

        {/* ==================== ZONE C: BOTTOM DOCK ==================== */}
        <div className="console-dock">
          <div className="dock-tabs" role="group" aria-label="Dock view">
            <button
              type="button"
              className={dockTab === 'scenarios' ? 'on' : ''}
              aria-pressed={dockTab === 'scenarios'}
              onClick={() => setDockTab('scenarios')}
            >
              Scenarios
            </button>
            <button
              type="button"
              className={dockTab === 'investigations' ? 'on' : ''}
              aria-pressed={dockTab === 'investigations'}
              onClick={() => setDockTab('investigations')}
            >
              Investigations
            </button>
          </div>

          {dockTab === 'scenarios' ? (
            <div className="glass dock-cards" role="group" aria-label="Choose an atmosphere">
              {scenarios.map((s) => {
                const active = s.id === activeId;
                const hasNear = s.n_near > 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`dock-card${active ? ' on' : ''}`}
                    aria-pressed={active}
                    onClick={() => selectScenario(s.id)}
                  >
                    <MiniFlameThumb o2={s.criteria.o2.value} />
                    <div className="dock-card-body">
                      <h4>{SHORT_NAME[s.id] ?? s.label}</h4>
                      <span className={`dock-chip${hasNear ? '' : ' warn'}`}>
                        <i aria-hidden="true" />
                        {hasNear ? 'Tests nearby' : 'No matching tests'}
                      </span>
                      <div className="dock-meta num">
                        <span>{fmtCriterionO2(s)}</span>
                        <b>
                          {s.n_exact}/{s.n_near}
                        </b>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <ul
              className="glass dock-cards dock-stats"
              aria-label="Key figures"
              style={{ listStyle: 'none', margin: 0 }}
            >
              {stats.map((s) => (
                <li key={s.src} className="dock-stat-item">
                  <p className="stat-n num">{s.n}</p>
                  <p className="stat-l">{s.label}</p>
                  <p className="stat-src mono">{s.src}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="glass dock-kpis" aria-label="Dataset coverage summary">
            <KpiRingSvg
              num={bassStated}
              den={bassProg?.n ?? materials.n_tests}
              label="BASS-II outcomes stated"
            />
            <KpiRingSvg
              num={flexCellsTested}
              den={coverage.n_cells}
              label="FLEX conditions tested"
            />
          </div>
        </div>
      </div>

      {/* Screen-reader & linear summary of the 3 key dataset figures when dock is on Scenarios tab */}
      {dockTab === 'scenarios' && (
        <ul className="sr-only" aria-label="Key figures">
          {stats.map((s) => (
            <li key={s.src}>
              <span className="num">{s.n}</span> {s.label} ({s.src})
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
