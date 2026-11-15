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
        <div className="stack" style={{ gap: 6 }}>
          <p><strong>Indicators (definitions).</strong></p>
          <ul className="interp-list">
            <li><strong>Complete</strong>: a declared outcome plus the key fields of its investigation. FLEX: fuel, O₂, pressure and a measured burning rate or extinction diameter. BASS-II: material, O₂ and a declared outcome (that investigation does not record pressure). AI-extracted outcomes count as complete and are reported separately.</li>
            <li><strong>Partial</strong>: at least one key field is missing (for example a BASS-II outcome that is not stated).</li>
            <li><strong>Scenario coverage</strong>: X of Y fuel and material groups with at least one test within {fmtTolerance(meta.tolerance)} of the atmosphere (FLEX fuels on O₂ and pressure, BASS-II material categories on O₂ only). A count of records, not a safety score.</li>
            <li><strong>Conditions without evidence</strong>: empty cells of the FLEX grid (fuel × O₂ band × pressure level) and, for the selected atmosphere, fuel × suppressant combinations with no test within tolerance.</li>
            <li><strong>Relevance order</strong> (Experiments view): Exact, then Near, then Not near, then tests with no recorded pressure. Within a class: distance max(|ΔO₂|/tolerance<sub>O₂</sub>, |Δpsi|/tolerance<sub>psi</sub>), smaller first; then a declared outcome before “not stated”; then larger n (tests in the same cell); then test ID. It orders records by closeness of conditions; it is not a safety ranking.</li>
          </ul>
        </div>
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
