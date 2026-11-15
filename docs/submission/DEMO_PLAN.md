# Demo plan — Flame in Freefall Explorer (Stars Rippers)

Rules (2026 Project Submission Guide): video **≤ 30 s** *or* **≤ 7 slides** (title and intro count). Over the limit =
not eligible for Global Judging. English on screen; spoken language may differ only with **English subtitles**. Must show
**team name, team members and the challenge**. Host on YouTube / Google Drive / GitHub with a public link (no login).

**Content rules for the demo**
- No NASA logos, flags or mission identifiers (the site has none; do not add any in editing).
- No images, video, audio or likeness of anyone under 18.
- If any AI-generated image, video or voice is used (e.g. AI text-to-speech, an AI background), it must carry a visible
  **"AI-generated"** watermark on screen and be mentioned in the description. The plan below uses **only screen
  recordings and our own voice**, so no watermark is needed unless you change that.
- Team members (**MANUAL: confirm full names and spelling**): Baz, Fer, Yael, Charly, Jovanny — Universidad Politécnica de
  Querétaro (UPQ). Mentor: Dr. Argelia.

---

## A. Video, 29 s (target 28–29 s; never above 30 s)

~70 words spoken at ≈ 2.4 words/s. Subtitles = narration (English). Values come from the real data
(`frontend/public/data/*.json`) and from `STATES` in `frontend/src/sections/AtmosphereExplorer.test.tsx`.

| Time | On screen (exact action) | Narration / subtitle (English) |
|---|---|---|
| 0:00–0:04 | Title card: **"Stars Rippers — Flame in Freefall Explorer"**, line 2: *Challenge: Flame in Freefall · NASA Space Apps 2026*, line 3: team names. Dark background, no logos. | "We are Stars Rippers. Our challenge: Flame in Freefall." |
| 0:04–0:10 | Overview loads. Click the **Moon base** card in the bottom dock: left card shows **17 near / 0 exact**; inspector shows ≥30% O₂, ≤10.2 psi. | "403 NASA fire tests from the ISS, sorted by cabin air. Moon-base air: zero exact tests, seventeen near." |
| 0:10–0:19 | Click **Custom**. Show the 5 states, ~1.8 s each, by moving the controls (or cut between the screenshots in `docs/screenshots/`): **mixed** — Both, 20% O₂, 14.6 psi → *34 of 56 ended in extinction, mixed outcomes*; **out** — Methanol, 14% O₂, 14.6 psi → *25 of 25*; **small n** — Both, 15% O₂, 10.3 psi → *n = 4, grey*; **stable** — Both, 34% O₂, 10.3 psi → *0 of 9*; **empty** — Both, 27% O₂, 20 psi → *No test within tolerance* + 3 closest buttons. | "Pick any oxygen and pressure: the flame shows only what real tests observed. Mixed outcomes, all extinguished, too few tests, or none." |
| 0:19–0:25 | Ctrl+K opens the SI Assistant. Click the suggested question **"What happens to a fire in lunar gravity?"** → card shows **No data** and the answer about microgravity only. (Basic level; if the local AI was verified working before recording, you may use Medium instead — see C.) | "The SI assistant cites every answer and says 'no data' for lunar gravity." |
| 0:25–0:29 | Open **Gaps** (top nav): list with "no partial-gravity data", "no test below 10.18 psi". End card: *Data: NASA PSI, CC0 · Code: Apache-2.0 · Not endorsed by NASA*. | "No predictions. Just the evidence, and its gaps." |

Export at 1920×1080, 30 fps. **Check the final file length (must show ≤ 0:30 in the player) before uploading.**

**Visuals (updated 15 Nov):** each scenario now has its own illustrative microgravity flame (round, faint, held by a match stick, oxygen
drifting in from every side; warmer and fainter near air, brighter and whiter at ≥30% O₂): `docs/screenshots/flame-earth-iss.png`,
`flame-moon.png`, `flame-lunar-habitat.png`, `flame-exploration.png`, `flame-spacesuit.png` (dimmed, "No matching tests — illustration only").
`flame-earth-1g-reference.png` is the optional **Earth 1 g (illustration)** comparison with its mandatory note "Reference only. This dataset has no 1 g or
partial-gravity tests." If you show it in the video, keep that note on screen. The camera is fixed (no rotation or wheel zoom).

## B. Alternative: 7 slides (including title)

| # | Slide | Content (English, few words) | Image |
|---|---|---|---|
| 1 | Title | Flame in Freefall Explorer · Stars Rippers · team names · Challenge: Flame in Freefall · NASA Space Apps 2026 | `docs/screenshots/explorer-mixed.png` (cropped to the chamber) |
| 2 | Problem | Moon habitats may use ≥30% O₂ at ≤10.2 psi. What do 403 NASA microgravity fire tests say about that air? | none / simple diagram |
| 3 | What we built | One-page dashboard organised by atmosphere: scenarios, coverage map, table, fuels, materials, gaps, SI assistant | `docs/screenshots/flame-earth-iss.png` (full Overview at 1600×1000) |
| 4 | Key finding | Moon-base air: **0 exact, 17 near** tests (10.33–10.50 psi, 30–34% O₂; 15 disruption, 2 completion). Earth/ISS: 49. Coverage 20/30 cells | `docs/screenshots/flame-moon.png` |
| 5 | Custom explorer | Retrieval, not simulation: mixed / all extinguished / n < 5 / no test | `explorer-out.png`, `explorer-small_n.png`, `explorer-empty.png` |
| 6 | Honest SI | Answers only from the data with DOIs; "No data" for lunar gravity; code checks every number; optional local models | screenshot of the assistant answering the lunar-gravity question |
| 7 | Limits & next | Microgravity only; no predictions; CO₂/He confounded; next: more PSI investigations, verified sources, real-model tests. Data CC0 · Code Apache-2.0 | `docs/screenshots/explorer-empty.png` or Gaps view |

## C. Recording script (step by step)

**Before recording (checklist)**
- [ ] Close other apps (browser tabs, chat, IDE indexing). `free -g`: **≥ 8 GB available** if you will show a local model.
- [ ] Screen 1920×1080, browser zoom 100%, full screen (F11). Notifications off. Mouse highlight on.
- [ ] Use a fresh browser profile or clear `localStorage` (the site remembers the scenario): DevTools → Application → Clear storage.
- [ ] Rehearse once with a timer.

**1. Website only (enough for the video above)**
```bash
cd ~/projects/nasa-psi-hackathon/frontend
npm install                      # once
npm run build && npm run preview # http://127.0.0.1:4173  (same build as the public site; Basic mode)
```

**2. Optional: local AI (only if verified before recording)**
The local models have **not** been run successfully in our tests yet. Do not show Flash/Medium/Heavy unless steps below
work end to end before you press record.
```bash
# Ollama models live on the "Windows Extend" disk (~/.ollama is a link to it): mount it first.
ollama serve &                                     # or: OLLAMA_MODELS=/path/with/space ollama serve &
ollama pull qwen3:8b                               # Medium (if not present); llama3.2:3b and qwen3:14b optional
cd ~/projects/nasa-psi-hackathon && source .venv/bin/activate
python scripts/build_experiments.py                # once: regenerates psi.sqlite
uvicorn backend.app:app --app-dir src --host 127.0.0.1 --port 8000 &
python -m pytest -m ollama -rs                     # must pass (not skip) for the model you will show
cd frontend && VITE_LLM_URL=http://127.0.0.1:8000 VITE_LLM_TIMEOUT_MS=90000 npm run dev   # http://127.0.0.1:5173
```
Warm-up: in the panel click **Connect local AI**, choose the level, ask one warm-up question
("How many experiments does this dashboard cover?") so the model is loaded, then start recording.
Heavy (qwen3:14b) can take tens of seconds per answer on CPU: cut the waiting time in editing, but **never cut in a way
that hides a "Basic"/"fallback" label** (the answer card shows which level actually answered).

**Exact questions to use**
1. Trap (required): **"What happens to a fire in lunar gravity?"** → must show **No data**.
2. "Are there tests at the expected Moon-base air (30% O2 or more, 10.2 psi or less)?" → 0 exact, 17 near, with test IDs.
3. Optional (local AI only): "Which fuel burns faster, heptane or methanol?" → check the badge says "AI-generated text"
   only if the model answer passed verification; otherwise it shows the template — keep it, it is honest.

**Shortcuts:** Ctrl+K open/close assistant · F hide cards (Focus) · + / − / 0 zoom the chamber · Esc closes panels.
