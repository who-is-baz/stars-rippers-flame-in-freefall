import { useGaps, useMeta } from '../data/useData';
import { Dois, Provisional, Section } from '../components/ui';

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

export function Gaps() {
  const { gaps } = useGaps();
  const meta = useMeta();
  return (
    <Section id="gaps" eyebrow="Gaps & limitations" title="What this data cannot tell you" badge={<Provisional />}
      lead={<>The gaps are part of the result. Each one below is something the PSI data shown on this page does not contain.
        Where there is no test, the answer is &ldquo;No data&rdquo;, never an estimate.</>}>
      <div className="stack">
        <div className="grid-auto">
          {gaps.map((g) => (
            <article key={g.id} className="glass gap">
              <span className="label mono">{g.id}</span>
              <p>{g.text}</p>
              <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>gaps.json · <Dois dois={g.source_doi} /></span>
            </article>
          ))}
          {SCOPE.map((g) => (
            <article key={g.id} className="glass gap">
              <span className="label mono">{g.id} · scope statement</span>
              <p>{g.text}</p>
              <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>{g.basis} Not an entry in gaps.json.</span>
            </article>
          ))}
        </div>
        <div className="glass card stack">
          <h3 className="h">Limitations that apply to every number on this page</h3>
          <ul className="plain">
            {meta.limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>meta.json · limitations · <Dois dois={meta.source_doi} /></span>
        </div>
      </div>
    </Section>
  );
}
