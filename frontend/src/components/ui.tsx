// Small shared building blocks. They only present values handed to them; they never compute statistics.
import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { doiUrl } from '../lib/format';
import { flagLabel } from '../lib/honesty';

type Tone = 'neutral' | 'caution' | 'info' | 'flame';
const TONE: Record<Tone, string> = { neutral: '', caution: ' badge-caution', info: ' badge-info', flame: ' badge-flame' };

export function Badge({ tone = 'neutral', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return <span className={`badge${TONE[tone]}`} title={title}>{children}</span>;
}

// A warning is always icon + text (never colour alone).
export function Warn({ children }: { children: ReactNode }) {
  return (
    <p className="warn" role="note">
      <TriangleAlert size={14} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="note" role="note">{children}</p>;
}

export const NoData = ({ why }: { why?: string }) => (
  <span className="nodata">No data{why ? ` (${why})` : ''}</span>
);

// qc flag: raw code visible, plain-language meaning in a tooltip (hover or keyboard focus).
export function QcChip({ flag }: { flag: string }) {
  const label = flagLabel(flag);
  return (
    <span className="chip" role="img" tabIndex={0} data-tip={`${label} [${flag}]`} aria-label={`QC flag: ${label}`}>
      <span aria-hidden="true">{flag}</span>
    </span>
  );
}
export function QcChips({ flags }: { flags: string[] }) {
  if (flags.length === 0) return <span className="dim">None</span>;
  return <span className="chips">{flags.map((f) => <QcChip key={f} flag={f} />)}</span>;
}

export function Doi({ doi }: { doi: string }) {
  return <a className="mono" href={doiUrl(doi)} target="_blank" rel="noreferrer noopener">doi:{doi}</a>;
}
export function Dois({ dois }: { dois: string[] }) {
  if (dois.length === 0) return <span className="dim">No dataset DOI (statement from the challenge text)</span>;
  return <>{dois.map((d, i) => <span key={d}>{i > 0 && ' · '}<Doi doi={d} /></span>)}</>;
}

export interface SegOption<T extends string> { value: T; label: string; disabled?: boolean; hint?: string }
export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: SegOption<T>[]; onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} disabled={o.disabled} title={o.hint}
          onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Section({ id, eyebrow, title, badge, lead, children }: {
  id: string; eyebrow: string; title: string; badge?: ReactNode; lead: ReactNode; children: ReactNode;
}) {
  return (
    <section id={id} className="section" aria-labelledby={`${id}-title`}>
      <header className="section-head">
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={`${id}-title`}>{title}{badge}</h2>
        <p>{lead}</p>
      </header>
      {children}
    </section>
  );
}

export const Provisional = () => (
  <Badge tone="caution" title="Provisional in the API contract: shape and content may change after data review">PROVISIONAL</Badge>
);

export function Skeleton({ h, w = '100%' }: { h: number; w?: string }) {
  return <div className="skeleton" style={{ height: h, width: w }} aria-hidden="true" />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state glass" role="alert">
      <h3>Data could not be loaded</h3>
      <p>Nothing is shown rather than showing numbers we cannot trace. Details: <span className="mono">{message}</span></p>
      {onRetry && <button type="button" className="btn" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="state"><h3>{title}</h3><div>{children}</div></div>;
}
