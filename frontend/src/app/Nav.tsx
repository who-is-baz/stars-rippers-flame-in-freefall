import { Sparkles } from 'lucide-react';
import { ROUTES, ROUTE_LABEL, hrefFor, type Route } from './routes';
import { useAssistant, useExplainMode } from '../providers';
import s from './Nav.module.css';

export function Nav({ active }: { active: Route }) {
  const { open, setOpen } = useAssistant();
  const { mode, setMode } = useExplainMode();
  return (
    <header className={s.bar}>
      <a className={s.brand} href={hrefFor('overview')}>Flame in Freefall</a>
      <nav aria-label="Main views" className={s.pills}>
        {ROUTES.map((r) => (
          <a key={r} href={hrefFor(r)} className={s.pill} aria-current={r === active ? 'page' : undefined}>
            {ROUTE_LABEL[r]}
          </a>
        ))}
      </nav>
      <div className={s.right}>
        {/* Abre/cierra el panel acoplado a la derecha (la UI del panel llega en otro paquete). */}
        <button type="button" className={s.cta} aria-pressed={open} onClick={() => setOpen(!open)}>
          <Sparkles size={16} strokeWidth={1.5} aria-hidden="true" /> SI assistant
        </button>
        <div role="group" aria-label="Explanation mode" className={s.toggle}>
          {(['explorer', 'engineer'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'explorer' ? 'Explorer' : 'Engineer'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
