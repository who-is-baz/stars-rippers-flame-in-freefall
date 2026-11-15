---
name: flame-design-system
description: Use before designing or styling any screen, card, chart, animation or visual of the Flame in Freefall dashboard. Defines the visual identity (full-bleed 3D combustion scene + floating graphite-glass cards, one mint accent), tokens, typography, layout zones, motion specs and plain-language copy rules. Wins over generic frontend-design guidance.
---

# Flame in Freefall · Sistema de diseño (v3)

Skills hermanas: `flame-react-frontend` (cómo se construye), `flame-data-viz` (cómo se muestra un dato sin mentir),
`flame-dashboard-builder` (tarjetas personalizables, primera vista y copiloto SI).

## 1. Identidad en una frase
Una **consola espacial amable**: la llama esférica de microgravedad, en 3D, ocupa el fondo; alrededor flotan pocas
tarjetas de vidrio grafito que responden una pregunta cada una. Grafito + **un acento menta**; el fuego es lo único
con color cálido/azul. Tomado de las referencias del cliente (objeto héroe, anotaciones, anillos, ficha lateral, dock);
por eso gana sobre la advertencia de `frontend-design` contra "fondo oscuro + un acento".

Nunca: logo/insignias/tipografía de NASA (footer: "Uses NASA PSI open data (CC0). Not endorsed by NASA."), ni los
conceptos falsos de las referencias: risk, threat, safe, defense, prediction, probability, impact zone.

## 2. Tokens → `src/design/tokens.css`
```css
:root{
  color-scheme:dark;
  /* superficies */
  --space:#040506; --graphite-9:#0C0E11; --graphite-8:#15181C; --graphite-7:#1F2328; --graphite-5:#3A4048;
  --silver:#C7CDD4; --ink:#F2F4F6; --ink-dim:#8E96A0; --ink-faint:#5B636D; /* faint: solo retícula, nunca texto */
  --glass:linear-gradient(150deg,rgba(255,255,255,.10),rgba(255,255,255,.035) 55%,rgba(255,255,255,.02));
  --glass-solid:rgba(14,16,19,.78); --glass-border:rgba(255,255,255,.10);
  --glass-hi:inset 0 1px 0 rgba(255,255,255,.08); --blur:20px;
  /* señales */
  --mint:#7FF5E1; --mint-dim:rgba(127,245,225,.16); --on-mint:#052A24;   /* interacción, selección, foco, CTA */
  --flame-core:#F4F7FF; --flame-blue:#6F8CFF; --ember:#FF8A3D;            /* solo visuales de combustión */
  --caution:#FFD166;                                                      /* advertencias (siempre con ⚠ + texto) */
  --nodata:#2A3037;                                                       /* sin datos (siempre rayado) */
  /* series (color por variable; nunca hex libres) */
  --fuel-heptane:#FF8A3D; --fuel-methanol:#A9B4C2;
  --prog-flex:#7FF5E1; --prog-bass2:#C9A2FF;
  --out-extinction:#9DB7FF; --out-disruption:#C9A2FF; --out-completion:#FFA36B;
  --out-blowoff:#7FE0C2; --out-noflame:#8E96A0;
  --seq-1:#26324F; --seq-2:#4A62B8; --seq-3:#8D8FD6; --seq-4:#E2A266; --seq-5:#FF8A3D;           /* burning rate */
  --cov-1:rgba(127,245,225,.10); --cov-2:rgba(127,245,225,.22); --cov-3:rgba(127,245,225,.38); --cov-4:rgba(127,245,225,.58); /* n */
  /* tipo */
  --font-ui:'Sora','Manrope',system-ui,sans-serif; --font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --fs-2xs:10.5px; --fs-xs:11.5px; --fs-sm:12.5px; --fs-base:14px; --fs-md:16px; --fs-lg:20px; --fs-num:34px; --fs-num-xl:48px;
  /* espacio, radios, capas */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:20px; --s-6:24px; --s-8:32px;
  --r-frame:24px; --r-panel:16px; --r-inner:10px; --r-cell:4px; --r-pill:999px;
  --z-scene:0; --z-grid:10; --z-nav:30; --z-drawer:40; --z-modal:50; --z-tooltip:60;
  /* movimiento */
  --t-fast:140ms; --t-base:240ms; --t-slow:420ms; --ease-out:cubic-bezier(.2,.8,.2,1);
}
```
Fuentes: **Sora** 300/400/500/600 (toda la UI; cifras en 300) + **IBM Plex Mono** 400/500 (solo anotaciones de la
escena e IDs de prueba). `display=swap`. Contraste de texto ≥4.5:1 medido sobre la zona más brillante de la escena
detrás del vidrio (por eso `--glass-solid` va debajo del gradiente).

## 3. Reglas de forma
- **Grafito primero**: antes de añadir color, usa peso tipográfico o borde. Menta: un CTA sólido por zona.
- **Cifras**: número grande Sora 300 + unidad o denominador pequeño `--ink-dim` (`17 tests`, `26/129`). Tabular nums.
- **Etiquetas en sentence case**, sin eyebrows en mayúsculas. Párrafos ≤ 60ch.
- **Radios por jerarquía** (frame 24 › panel 16 › inner 10 › cell 4). Sombra solo `--glass-hi` + `0 20px 50px rgba(0,0,0,.45)`.
- **Iconos**: Lucide, trazo 1.5, 16/18px, `--silver`.
- Nada depende solo del color: texto, icono o patrón (rayado = sin datos, punteado = `not_stated`).

## 4. Zonas de la pantalla (escritorio ≥1280)
```
┌ Top bar: ◎ marca · [Overview][Explore][Coverage][Gaps] · ● data status · [Ask SI…] · [Customize] · [Explorer|Engineer] ┐
│ ┌SI┐ ┌ Zona A (izq.) ┐            ESCENA 3D (fondo, centro reservado)            ┌ Zona B (der.) ┐ │
│ │ ✦│ │ tarjetas      │      anotaciones · zoom Chamber/Flame/Droplet         │ inspector +   │ │
│ │  │ │               │                                                        │ tarjetas      │ │
│ └──┘ └───────────────┘                                                        └───────────────┘ │
│      ┌ Zona C (dock): selector de escenarios + tarjetas cortas ─────────────────────────────────┐ │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- La escena es la capa de fondo; el centro queda **reservado** (las tarjetas no lo tapan).
- La pestaña vertical "SI" en el borde izquierdo abre el **copiloto** como drawer desde la izquierda (380px).
- Breakpoints: ≥1280 consola completa · 1024–1279 zona A plegada a iconos · 768–1023 escena 60vh arriba y tarjetas
  debajo en una columna de 2 · <768 escena 360px + barra inferior fija (Overview, Explore, Ask, Customize), tarjetas
  apiladas, objetivos táctiles ≥44px.

## 5. Movimiento (especificación para construir)
Biblioteca: **Motion** (`motion/react`, antes Framer Motion). Valores fijos para que todo se sienta igual:

| Momento | Animación | Valores |
|---|---|---|
| Carga inicial | escena: cámara se acerca de 1.4× a 1×; tarjetas entran en cascada | cámara 900ms `--ease-out`; tarjetas opacity 0→1 + y 8→0, 240ms, stagger 60ms, **una sola vez** |
| Cambio de escenario (momento estrella) | llama cambia escala/brillo; cifras cuentan | 600ms; conteo con `animate()` de 0 al valor |
| Abrir tarjeta (expandir) | la tarjeta crece a modal con `layoutId` compartido | spring `{stiffness:400, damping:34}`; scrim 0→.6 en 240ms |
| Reordenar / soltar tarjeta | las demás se reacomodan | `layout` spring igual; sombra de "levantada" solo mientras arrastras |
| Añadir tarjeta (usuario o SI) | aparece en su hueco con brillo menta que se apaga | scale .96→1 + opacity, 240ms; contorno menta 1.2s fade |
| Quitar tarjeta | se encoge y desvanece; toast "Card removed · Undo" | 180ms; toast 5s |
| Drawers (copiloto izq., galería der.) | deslizan desde su borde | 420ms `--ease-out`; contenido entra 60ms después |
| Hover | solo el borde sube a `rgba(255,255,255,.18)` | 140ms; nada flota |
| Escena idle | parpadeo de llama ≤3% de escala, anillo de retícula 60s/vuelta | se pausa fuera de pantalla y con pestaña oculta |

`prefers-reduced-motion`: sin cascada, sin conteo, sin parpadeo; transiciones a opacidad 120ms; zoom por saltos.
Objetivo 60 fps: animar solo `transform`/`opacity`; nunca `width/height/top/left`.

## 6. Escena 3D (contrato de interacción)
| Acción | Ratón | Táctil | Teclado | Resultado |
|---|---|---|---|---|
| Orbitar | arrastrar | 1 dedo | flechas | gira alrededor de la gota con amortiguación |
| Zoom | rueda | pellizco | `+` `−` | 3 niveles semánticos: **Chamber → Flame → Droplet**; botones `+ − ⟲` siempre visibles |
| Explorar | hover | toque | Tab | anotación con tooltip (texto Explorer/Engineer) |
| Seleccionar | clic | toque | Enter | el inspector muestra ese punto |
Leyenda fija: "Illustration. Not a combustion simulation." Pista "drag to rotate · scroll to zoom" se oculta tras el primer uso.

## 7. Texto amable (inglés en la UI)
- Cada tarjeta se titula con **la pregunta que responde**, en palabras de cualquiera: "How many tests match this air?",
  no "Scenario match count".
- Debajo de la cifra, **una frase de lectura**: "None exactly; 17 are close." Tecnicismos en el modo Engineer.
- Primera mención de "SI": "SI assistant (super intelligence — an AI that only answers from these NASA data)".
- Botones con verbo: "Show 17 tests", "Add card", "Ask SI". Vacíos y errores dicen qué pasó y qué hacer.

## 8. Checklist del PR
- [ ] 1440 / 1024 / 768 / 390 px: nada se desborda y el centro de la escena queda libre.
- [ ] Teclado completo (escena, tarjetas, drawers); foco visible menta.
- [ ] Solo menta, fuego, ámbar y colores de serie; nada de hex sueltos.
- [ ] Cada tarjeta: título-pregunta + cifra + frase de lectura + fuente.
- [ ] Movimiento según §5 y reducido probado.
- [ ] Sin marca NASA ni vocabulario prohibido.
