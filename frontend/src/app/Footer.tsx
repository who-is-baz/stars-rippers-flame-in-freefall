import { useMeta } from '../data/useData';
import s from './App.module.css';

// La licencia sale de meta.license (hoy CC0-1.0), no se escribe a mano.
export function Footer() {
  const meta = useMeta();
  return (
    <footer className={s.footer}>
      Uses NASA PSI open data ({meta.license}). Not endorsed by NASA.
    </footer>
  );
}
