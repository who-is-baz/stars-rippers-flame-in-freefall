import { useMeta } from '../data/useData';
import s from '../app/App.module.css';

// Marcador del paquete A: confirma que la vista y los datos cargan. Las vistas reales llegan en B1–G.
export function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  const meta = useMeta();
  return (
    <section className={s.view} aria-labelledby="view-title">
      <h1 id="view-title" tabIndex={-1}>{title}</h1>
      <p>{blurb}</p>
      <p className={s.stat}>{meta.n_tests} tests loaded · {meta.programs.map((p) => `${p.program} (${p.psi_id}) n = ${p.n}`).join(' · ')}</p>
    </section>
  );
}
