# Escenario Marte: ¿hay fuente oficial de NASA?

**Fecha:** 2026-11-14 · **Rama:** `feat/baz-resumen-equipo` · **Hecho por:** Claude Code (Opus 5.5) para Baz.
**Red usada:** solo las 3 URL autorizadas de ntrs.nasa.gov, en lectura. Ningún contacto con psi.nasa.gov.

## Veredicto: **PARCIAL**
- **Sí hay fuente NASA para la presión de los hábitats de superficie de Marte: 8.2 psia.** Vale tanto para el rover presurizado de
  las primeras misiones como para el hábitat mayor de las siguientes.
- **Ese documento no da el % de O₂ de la superficie.** El valor 34 % solo aparece emparejado con 8.2 psi en otros dos documentos: la
  "Exploration Atmosphere", estudiada para "planetary surface exploration of the Moon, Mars and beyond", y el requisito de la cabina
  del vehículo de ascenso (MAV).
- **Conclusión:** "Marte = 8.2 psia / 34 % O₂" es una **combinación de dos fuentes**, no una cifra única de un documento sobre la
  superficie de Marte.
- **Nombre recomendado:** "Exploration Atmosphere (8.2 psia / 34 % O₂), propuesta para superficies lunar y marciana". Mejor que
  "atmósfera de Marte".

## Fuentes revisadas

| NTRS | Documento (según el propio documento) | Página | Qué dice (paráfrasis) | Cita textual (≤15 palabras) | Estado |
|---|---|---|---|---|---|
| 20230009095 | "Environmental Control and Life Support (ECLS) System Options for Mars Transit and Mars Surface Missions". NASA MSFC; Zach Bryant y Andrew Choate (Jacobs Space Exploration Group), David Howard (NASA/ES62). 16 jul 2023, ICES-2023-265. 30 pp. | p.16 "Overview of Mars Surface Habitats" | Misiones iniciales: hábitat móvil (rover presurizado), hasta 30 soles. Misiones siguientes: hábitat mayor y más permanente, 30+ soles. Ambos a 8.2 psia | "Mobile habitation (via Pres. Rover) … 8.2 psia atmosphere" | **Verificado** (presión) |
| 20230009095 | ídem | p.16 y todo el documento | **No se encontró** ningún % de O₂ para la superficie de Marte; en todo el texto extraído no aparece "34 %" | — | **Verificado: ausente** |
| 20230009095 | ídem | p.7 | Hábitat de tránsito: 10.2 psia con 26.5 % O₂ para operar acoplado a Gateway; 14.7 psia con 21 % O₂ para el tránsito | "10.2 psia (26.5% O2) atmosphere for Gateway ops" · "14.7 psia (21% O2) atmosphere for transit and analog missions" | **Verificado** |
| 20230009095 | ídem | p.27 | El tránsito es nominal a 14.7 psia / 21 % O₂ y puede operar a 10.2 psia / 26.5 % O₂ | "14.7 psia 21% O2 atmosphere nominal, capable of 10.2 psia 26.5% O2" | **Verificado** |
| 20170001585 | Presentación sobre la cabina del Mars Ascent Vehicle (MAV). Autores en p.1: Mike Gernhardt, Omar Bekdash, Harry Litaker, Steven Chappell, Kara Beaton, Carolyn Newton, Edwin Crues, Andrew Abercromby. **Título y fecha no extraídos** (la portada no tiene texto legible). 49 pp. | p.4 "Functional Requirements for MAV Cabin (2 of 2)" | La atmósfera de la cabina del MAV debe poder controlarse entre 8.2 psi / 34 % O₂ y la atmósfera estándar de 14.7 psi | "The atmosphere should be controllable between 8.2psi /34% O2 and 14.7 psi" | **Verificado** (requisito del MAV, no del hábitat) |
| 20220015741 | Ficha NTRS (solo el resumen): "Medical Lessons Learned from the Exploration Atmospheres Study". R. Sanders, K. Ray, J. Law, D. Reyes (JSC). AsMA 2023, Nueva Orleans, 21–25 may 2023. Registro creado el 19 oct 2022 | resumen (sin páginas) | El estudio EA probó una cabina alternativa de 8.2 psia y 34 % O₂, con despresurizaciones a 4.3 psia y 85 % O₂ para EVA simuladas, pensada para superficies de la Luna, Marte y más allá | "(8.2 psia, 34% Oxygen)" · "additional depresses to 4.3 psia at 85% O2 for simulated EVAs" · "planetary surface exploration of the Moon, Mars and beyond" | **Verificado** (lo leyó un subagente; el .docx adjunto no se abrió) |

**Método:** la herramienta web no extrajo texto de los dos PDF. Se leyeron los mismos PDF ya descargados (sin nuevas peticiones),
extrayendo el texto con un script de la librería estándar de Python (`zlib`) que vive en el scratchpad, fuera del repo. Las páginas
se ubicaron con el árbol de páginas del PDF. Las citas son literales del texto extraído.

## Corrección a lo que decíamos antes
El **texto oficial del reto** (`docs/08-reto-oficial.md`, "Spacesuits and oxygen concentration") sí dice:
- Luna: "likely be 30% or greater, with a corresponding pressure of 10.2 psi or less".
- Traje: "100% oxygen to only 4.3 psi".

Por lo tanto, la definición lunar de Fer y su "100 % O₂ a 4.3 psi" **sí tienen fuente: el enunciado del reto**, aunque no un
documento técnico NTRS. El informe de Yael (`docs/analisis/rangos-o2-presion/informe.md`) y el pedido de Baz los marcaban "sin
fuente"; eso hay que corregirlo. Los NTRS dan 85 % O₂ a 4.3 psia, pero para **EVA simulada** en una prueba con personas. No es
una contradicción directa: es otro contexto.

## Qué escenario de FLEX respalda
| Escenario | Fuente | n en FLEX (±0.01 O₂, ±0.5 psi) | Vecino más cercano (no es el escenario) |
|---|---|---|---|
| Superficie Marte / Exploration Atmosphere: 8.2 psia, 34 % O₂ | NTRS 20230009095 p.16 (presión); 20220015741 y 20170001585 p.4 (34 %) | **0** | O₂ 0.34 a 10.33–10.50 psi: **n = 9**, todas sin supresor, 8 disruption y 1 completion (192F001, 196F001, 224F001…). +2.13 psi |
| Tránsito a Marte, nominal: 14.7 psia, 21 % O₂ | NTRS 20230009095 p.7, p.27 | **49** (29 sin supresor) | — |
| Tránsito acoplado a Gateway: 10.2 psia, 26.5 % O₂ | NTRS 20230009095 p.7, p.27 | **0** | O₂ 0.25 a ~10.4 psi: n = 6, **todas con CO₂/He** |

## Qué NO afirmar
- **FLEX no es Marte.** Son gotas de metanol y heptano en **microgravedad, en la ISS**. Solo la *atmósfera* (O₂ y presión) puede
  parecerse a la de un hábitat. La gravedad (0.38 g en Marte), la ventilación y los materiales no se parecen.
- **No hay datos de gravedad parcial en PSI**, según el texto del reto.
- **El CO₂ de FLEX no es la atmósfera marciana:** es un supresor agregado a propósito a la cámara. No hay datos de la superficie
  ni del CO₂ de Marte.
- **No hay ninguna prueba a 8.2 psi ni a 4.3 psi.** El vecino de 34 % a ~10.4 psi no es "el caso marciano".
- 8.2/34 es una atmósfera **propuesta y estudiada**, no un diseño final confirmado. No presentarla como "la atmósfera de Marte".
- Sin probabilidades: FLEX eligió sus condiciones de forma iterativa. "Disruption" no está definido por la fuente.
