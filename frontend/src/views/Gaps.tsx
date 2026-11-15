import { Fragment } from 'react';
import { CircleSlash } from 'lucide-react';
import { useGaps, useMeta } from '../data/useData';
import { Panel, Sources } from '../components/kit';
import u from '../components/ui.module.css';

// Huecos: texto tal cual del JSON, con evidencia y DOI. Los huecos son hallazgos.
const fmtEvidence = (v: unknown): string =>
  typeof v === 'object' && v !== null ? JSON.stringify(v).replace(/[{}"[\]]/g, ' ').replace(/\s+/g, ' ').trim() : String(v);

export function Gaps() {
  const { gaps } = useGaps();
  const meta = useMeta();
  return (
    <div className={u.view}>
      <header className={u.head}>
        <h1 className={u.h1}>What can’t these data tell us?</h1>
        <p className={u.lead}>Gaps are findings too: before planning around these tests, know where they stop.</p>
      </header>
      <div className={u.grid2}>
        {gaps.map((g) => (
          <Panel key={g.id} id={`gap-${g.id}`} title={g.text} icon={<CircleSlash size={18} strokeWidth={1.5} />} footer={<Sources dois={g.source_doi} />}>
            <details>
              <summary className={u.dim}>Evidence</summary>
              <dl className={u.kv}>
                {Object.entries(g.evidence).map(([k, v]) => <Fragment key={k}><dt>{k.replace(/_/g, ' ')}</dt><dd>{fmtEvidence(v)}</dd></Fragment>)}
              </dl>
            </details>
          </Panel>
        ))}
      </div>
      <Panel id="limits" title="Known limitations of these data">
        <ul className={u.flags}>{meta.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
      </Panel>
    </div>
  );
}
