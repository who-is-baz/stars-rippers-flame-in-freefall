// Kit base: piezas que hacen visibles las reglas de honestidad (flame-data-viz §1).
import type { ReactNode } from 'react';
import { AlertTriangle, Bot, ExternalLink, Info } from 'lucide-react';
import { useMeta } from '../data/useData';
import { doiUrl } from '../lib/format';
import { isSmallN, smallNLabel } from '../lib/honesty';
import s from './kit.module.css';

export function Panel({ title, icon, children, footer, id, className }: {
  title: ReactNode; icon?: ReactNode; children: ReactNode; footer?: ReactNode; id?: string; className?: string;
}) {
  return (
    <section className={`${s.panel} ${className ?? ''}`} aria-labelledby={id}>
      <h2 className={s.panelTitle} id={id}>{icon}{title}</h2>
      <div className={s.panelBody}>{children}</div>
      {footer && <div className={s.panelFoot}>{footer}</div>}
    </section>
  );
}

// Programa · PSI-ID → doi.org. El nombre del programa se busca en meta por DOI.
export function SourceChip({ doi }: { doi: string }) {
  const meta = useMeta();
  const p = meta.programs.find((x) => x.source_doi === doi);
  return (
    <a className={s.chip} href={doiUrl(doi)} target="_blank" rel="noreferrer" title={`Source dataset: doi:${doi}`}>
      {p ? `${p.program} · ${p.psi_id}` : `doi:${doi}`} <ExternalLink size={12} strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">(opens doi.org in a new tab)</span>
    </a>
  );
}
export function Sources({ dois }: { dois: string[] }) {
  if (dois.length === 0) return <span className={s.dim}>No source: no tests here</span>;
  return <span className={s.row}>{[...new Set(dois)].map((d) => <SourceChip key={d} doi={d} />)}</span>;
}

export function NCount({ n }: { n: number }) {
  return <span className={s.n}>n = {n}</span>;
}

export function Warn({ children }: { children: ReactNode }) {
  return (
    <p className={s.warn}><AlertTriangle size={14} strokeWidth={1.5} aria-hidden="true" /><span>{children}</span></p>
  );
}

// n<5 → ámbar + ⚠ + texto (umbral desde meta.min_n).
export function SmallN({ n }: { n: number }) {
  const { min_n } = useMeta();
  if (n === 0 || !isSmallN(n, min_n)) return null;
  return <Warn>{smallNLabel(n)}</Warn>;
}

export function AiBadge() {
  return <span className={s.ai} title="Extracted by AI from free-text notes; pending human review"><Bot size={12} strokeWidth={1.5} aria-hidden="true" /> AI-extracted</span>;
}

export function NoData({ children }: { children: ReactNode }) {
  return <div className={s.nodata} role="note"><strong>No data available.</strong> <span>{children}</span></div>;
}

export function Hint({ label, text }: { label: string; text: string }) {
  return (
    <span className={s.hint}>
      <Info size={13} strokeWidth={1.5} aria-hidden="true" />
      <span><strong>{label}:</strong> {text}</span>
    </span>
  );
}

export function Legend({ items }: { items: { label: string; swatch: string; pattern?: 'stripe' | 'dot' | 'warn' }[] }) {
  return (
    <ul className={s.legend} aria-label="Legend">
      {items.map((i) => (
        <li key={i.label}><span className={`${s.swatch} ${i.pattern ? s[i.pattern] : ''}`} style={{ background: i.swatch }} aria-hidden="true" />{i.label}</li>
      ))}
    </ul>
  );
}
