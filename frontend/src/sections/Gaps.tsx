import { useState } from 'react';
import { useGaps, useMeta } from '../data/useData';
import { Dois, Provisional, Section, Segmented } from '../components/ui';

// Scope statements that are NOT entries in gaps.json. They carry no figures; each says what it rests on.
const SCOPE: { id: string; text: string; basis: string }[] = [
  {
    id: 'normal_gravity',
    text: 'No normal-gravity (1 g) tests: this page cannot compare a flame on the ground with a flame in orbit.',
    basis: 'Follows from meta.json: all tests were run in microgravity on the ISS.',
  },
  {
    id: 'propellants',
    text: 'No rocket propellants or engine combustion: FLEX burned heptane and methanol droplets, BASS-II burned small solid samples.',
    basis: 'Follows from the fuels and materials listed in experiments.json.',
  },
];

type GapTab = 'core' | 'scope' | 'rules' | 'all';

export function Gaps() {
  const { gaps } = useGaps();
  const meta = useMeta();
  const [tab, setTab] = useState<GapTab>('core');

  return (
    <Section id="gaps" eyebrow="Gaps & limitations" title="What this data cannot tell you" badge={<Provisional />}
      lead={<>Where there is no test, the answer is &ldquo;No data&rdquo;, never an estimate. Switch views below to inspect data gaps, scope limits, or statistical rules.</>}>
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Segmented
            label="View"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'core', label: `Core data gaps (${gaps.length})` },
              { value: 'scope', label: `Scope limits (${SCOPE.length})` },
              { value: 'rules', label: `Dataset rules (${meta.limitations.length})` },
              { value: 'all', label: 'Show all' },
            ]}
          />
        </div>

        {(tab === 'core' || tab === 'all') && (
          <div className="grid-2">
            {gaps.map((g) => (
              <article key={g.id} className="glass gap">
                <span className="label mono">{g.id.replace(/_/g, ' ')}</span>
                <p>{g.text}</p>
                <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>gaps.json · <Dois dois={g.source_doi} /></span>
              </article>
            ))}
          </div>
        )}

        {(tab === 'scope' || tab === 'all') && (
          <div className="grid-2">
            {SCOPE.map((g) => (
              <article key={g.id} className="glass gap">
                <span className="label mono">{g.id.replace(/_/g, ' ')} · scope boundary</span>
                <p>{g.text}</p>
                <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>{g.basis}</span>
              </article>
            ))}
          </div>
        )}

        {(tab === 'rules' || tab === 'all') && (
          <div className="glass card stack">
            <h3 className="h">Limitations that apply to every number on this page</h3>
            <ul className="plain">
              {meta.limitations.map((l) => <li key={l}>{l}</li>)}
            </ul>
            <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>meta.json · limitations · <Dois dois={meta.source_doi} /></span>
          </div>
        )}
      </div>
    </Section>
  );
}
