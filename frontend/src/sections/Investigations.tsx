// Full view: fire-safety pillars and the catalog of investigations named in the official challenge text.
// Catalog fields come only from investigations.json (challenge text); counts, PSI ids and DOIs only from meta.json.
// A field the text does not state reads "not stated". Order = evidence available on this site, not a safety ranking.
import { useMemo, useState } from 'react';
import { useInvestigations, useMeta } from '../data/useData';
import { useUi } from '../state/ui';
import { Doi, Section, Segmented } from '../components/ui';
import {
  NOT_STATED, ORDER_NOTE, ORDER_RULE, STATUS_LABEL, filterByPillar, orderInvestigations, pillarLabel, pillarSummary,
  programOf, psiSearchUrl, type PillarFilter,
} from '../lib/investigations';

const cell = (v: string) => (v === NOT_STATED ? <span className="dim">{NOT_STATED}</span> : v);

export function Investigations() {
  const file = useInvestigations();
  const meta = useMeta();
  const { showTests, openView } = useUi();
  const [pillar, setPillar] = useState<PillarFilter>('all');
  const pillars = useMemo(() => pillarSummary(file, meta), [file, meta]);
  const rows = useMemo(() => filterByPillar(orderInvestigations(file.investigations), pillar), [file, pillar]);
  const nProcessed = file.investigations.filter((r) => programOf(r, meta)).length;

  const openGrouped = () => {
    try { window.history.replaceState(null, '', '#experiments?group=1'); } catch { /* ignore */ }
    openView?.('explore');
  };

  return (
    <Section id="investigations" eyebrow="Investigations" title="Investigations & fire-safety pillars"
      lead={<>The {file.investigations.length} investigations named in the {file.source}, by the pillar that text ties them to. Test-level data is processed here for {nProcessed} of them; for the rest this page repeats only what the text says.</>}>
      <div className="stack">
        <div className="pillar-grid" role="list" aria-label="Fire-safety pillars">
          {pillars.map((p) => (
            <article key={p.id} className="glass card stack pillar-col" role="listitem" aria-label={p.label}>
              <span className="eyebrow">{p.label}</span>
              <p className="pillar-what">{p.what}</p>
              <p className="pillar-count num">
                {p.processed.length > 0
                  ? p.processed.map((x) => <span key={x.name}><b>{x.name}</b> {x.n} tests processed</span>)
                  : <span><b>0</b> processed here{p.names.length > 0 ? ` (${p.names.join(' / ')} exist in PSI)` : ''}</span>}
              </p>
              <p className="dim" style={{ fontSize: 'var(--fs-xs)', margin: 0 }}>{p.names.join(' · ')}</p>
              <span className="dim" style={{ fontSize: 'var(--fs-xs)' }}>
                {p.processed.length > 0 ? <>meta.json · {p.processed.map((x) => <span key={x.name}>{x.psi_id} · <Doi doi={x.source_doi} /> </span>)}</> : <>{file.source}</>}
              </span>
            </article>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Segmented
            label="Filter by pillar"
            value={pillar}
            onChange={setPillar}
            options={[
              { value: 'all', label: `All (${file.investigations.length})` },
              ...file.pillars.map((p) => ({ value: p.id as PillarFilter, label: p.label })),
              { value: 'not stated' as PillarFilter, label: 'Pillar not stated' },
            ]}
          />
          <button type="button" className="btn btn-sm" onClick={openGrouped}>Tests grouped by investigation</button>
        </div>
        <p className="rel-note" role="note"><strong>{ORDER_NOTE}</strong> {ORDER_RULE}</p>

        <div className="scroll-x" tabIndex={0} role="region" aria-label="Investigations catalog (scrolls)">
          <table className="data inv-table">
            <thead>
              <tr><th scope="col">Investigation</th><th scope="col">Pillar</th><th scope="col">Fuel type</th><th scope="col">Hardware</th><th scope="col">Status</th><th scope="col">Source</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pm = programOf(r, meta);
                return (
                  <tr key={r.id} className={pm ? 'rel-exact' : undefined}>
                    <th scope="row">
                      <b>{r.name}</b>{r.parent ? <span className="dim"> · {r.parent}</span> : null}
                      <div className="dim inv-full">{r.full_name === NOT_STATED ? 'full name not stated' : r.full_name}</div>
                    </th>
                    <td>{cell(pillarLabel(file, r.pillar))}</td>
                    <td>{cell(r.fuel)}</td>
                    <td>{cell(r.hardware)}</td>
                    <td>
                      {pm ? (
                        <>
                          <span className="badge badge-info">{STATUS_LABEL.processed}</span>
                          <div className="num inv-full">{pm.n} tests · {pm.psi_id} · <Doi doi={pm.source_doi} /></div>
                          <button type="button" className="ind-link" onClick={() => showTests({ program: pm.program })}>Open its tests</button>
                        </>
                      ) : r.status === 'future' ? (
                        <span className="badge">{STATUS_LABEL.future}</span>
                      ) : (
                        <>
                          <span className="badge">{STATUS_LABEL.in_psi}</span>
                          <div className="inv-full"><a href={psiSearchUrl(file.psi_search_base, r.name)} target="_blank" rel="noreferrer noopener">Search PSI for {r.name}</a></div>
                        </>
                      )}
                    </td>
                    <td className="dim inv-src">{r.note} <span className="src-pill">{r.source}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="next-tests-note">
          <strong>Applications on Earth.</strong> {file.earth_applications.text} <span className="src-pill">from the challenge text</span>
        </p>
      </div>
    </Section>
  );
}
