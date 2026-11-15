import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import './design/global.css';
import App from './app/App';

// Solo en desarrollo: recarga la página cada 5 s para ver cambios (pedido del equipo).
// Se desactiva abriendo http://127.0.0.1:5173/?norefresh  (no afecta al build de producción).
if (import.meta.env.DEV && !new URLSearchParams(window.location.search).has('norefresh')) {
  window.setInterval(() => window.location.reload(), 5000);
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
