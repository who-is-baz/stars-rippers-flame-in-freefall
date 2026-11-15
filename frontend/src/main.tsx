import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter'; // bundled font: no CDN, no network at runtime
// Sora (UI) and IBM Plex Mono (annotations), self-hosted (OFL-1.1): the public site makes no third-party requests.
import '@fontsource/sora/latin-300.css';
import '@fontsource/sora/latin-400.css';
import '@fontsource/sora/latin-500.css';
import '@fontsource/sora/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './design/tokens.css';
import './design/global.css';
import App from './App';
import './intro'; // opening intro (match → light). Delete this one line to remove it; ?intro=off disables it at runtime.
import './perf'; // automatic light mode for slow devices (decoration only); ?perf=lite forces it, ?perf=full disables it.

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
