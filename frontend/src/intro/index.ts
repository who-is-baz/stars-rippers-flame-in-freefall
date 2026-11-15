// Side-effect entry: importing this file shows the opening intro on every full page load (and on a back/forward cache
// restore); ?intro=off disables it. To remove the intro, delete the single `import './intro';` line in src/main.tsx.
// This module runs once per page load (ES modules are evaluated once), so React StrictMode cannot mount it twice.
import { mountIntro, onPageShow } from './mount';

mountIntro();
window.addEventListener('pageshow', onPageShow);
