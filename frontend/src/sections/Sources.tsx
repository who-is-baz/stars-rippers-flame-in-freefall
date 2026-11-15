import { useMeta } from '../data/useData';
import { Doi, Section } from '../components/ui';
import { fmtTolerance } from '../lib/scenario';

// Credits, licence and limits (moved out of the old page footer: the console has no scroll area for one).
export function Sources() {
  const meta = useMeta();
  return (
    <Section id="sources" eyebrow="Sources & credits" title="Where the data comes from"
      lead={<>Everything on this site is read from NASA Physical Sciences Informatics (PSI) open data, license {meta.license}.</>}>
      <div className="glass card stack">
        <p>
          <strong>Data:</strong>{' '}
          {meta.programs.map((p, i) => (
            <span key={p.program}>{i > 0 && ' · '}{p.program} ({p.psi_id}): <Doi doi={p.source_doi} /></span>
          ))}
        </p>
        <p>
          <strong>Method (Custom atmosphere explorer):</strong> it retrieves the FLEX tests within {fmtTolerance(meta.tolerance)} of
          the chosen fuel, O₂, pressure and suppressant and shows their counts and plain means with n. No interpolation,
          extrapolation or curve fitting; settings without tests show &ldquo;No test within tolerance&rdquo;. BASS-II is not included.
        </p>
        <p><strong>Code:</strong> Apache-2.0 license. <strong>Interface design assisted by AI.</strong> Outcomes marked &ldquo;AI-extracted&rdquo; await human review.</p>
        <p className="dim">
          Built by Stars Rippers for the NASA Space Apps Challenge 2026. Uses NASA PSI open data (CC0). Not endorsed by NASA.
          No predictive model. Not safety guidance. Data files generated {meta.generated_utc.slice(0, 10)} by {meta.generated_by}.
        </p>
      </div>
    </Section>
  );
}
