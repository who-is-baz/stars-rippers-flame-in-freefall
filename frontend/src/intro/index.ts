// Side-effect entry: importing this file shows the opening intro (once per session; ?intro=on forces it, ?intro=off disables it).
// To remove the intro, delete the single `import './intro';` line in src/main.tsx.
import { mountIntro } from './mount';

mountIntro();
