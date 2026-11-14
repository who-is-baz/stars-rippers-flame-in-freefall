# Nuestros datos: lo que podemos y no podemos decir

> Complemento de la guía de estudio del equipo. Leer en 15 minutos. Fuente de detalle: `docs/03-analisis-datos.md` y `docs/data-dictionary.md`. Si algo de aquí contradice esos archivos, mandan ellos.

## 1. Qué datos tenemos
| | FLEX (PSI-69) | BASS-II (PSI-25) |
|---|---|---|
| Qué se quemó | Gotas de combustible **líquido** (heptano, metanol…) | Materiales **sólidos** (telas, plásticos) |
| Dónde | ISS, CIR + MDCA | ISS, glovebox (MSG) con ducto de flujo |
| Pruebas en nuestra tabla | 274 | 129 |
| Qué sirve más | O₂, presión, supresor (CO₂, He), tasa de combustión, diámetro de extinción | Material, espesor, O₂ medido, CO/CO₂ |
| Papel en el proyecto | **Núcleo** | **Contexto** |
| DOI (licencia **CC0-1.0**) | 10.60555/mbq8-0451 | 10.60555/4qc4-de67 |

En total son 403 filas en `data/processed/experiments.csv`. Toda cifra que muestre el dashboard o el asistente debe citar el DOI y el experimento.

**Por qué importa que sean dos tipos de fuego distintos:** FLEX habla de **supresión** (qué tanto cuesta apagar una gota); BASS-II habla de **inflamabilidad de materiales** (si un sólido arde). No mezclen conclusiones de uno y otro.

## 2. Diez reglas para no equivocarse
1. **FLEX buscaba el límite de extinción.** Un "% de extinción" describe lo que se probó, **no es una probabilidad** de que algo se apague.
2. **CO₂ y helio están confundidos con el O₂** en varias celdas. No atribuyan un efecto a un solo factor.
3. **Con n < 5, siempre advertencia** y celda en gris. Nunca un porcentaje sin su n.
4. El diámetro de extinción solo existe cuando el resultado fue extinción.
5. **En BASS-II, `not_stated` no significa "no se extinguió"**: significa que la fuente no lo dice. No calculen % de extinción de BASS-II.
6. En FLEX el O₂ lo **fija el ensayo**; en BASS-II se **mide en la cámara**. No son lo mismo.
7. **"Disruption" no está definido por la fuente.** Se muestra como "no definido por la fuente"; no lo interpreten.
8. Los valores dudosos se **marcan** (`qc_flags`), no se corrigen en silencio. Ejemplo conocido: ID duplicado FLEX 193F001.
9. **Todo lo que extrajo la IA se etiqueta** (`ai_*`, `extracted_by=AI`) hasta que Fer lo revise. Solo 26 de las 129 pruebas de BASS-II tienen resultado declarado, y esos 26 los extrajo la IA.
10. **Sin modelo predictivo.** Mostramos lo observado, no pronosticamos incendios.

## 3. Lo que NO tenemos (y es parte de la historia)
- **No hay gravedad parcial en PSI.** Ni Luna (1/6 g) ni Marte (≈3/8 g). El reto lo dice. Solo hay microgravedad.
- **No hay datos en gravedad normal** para comparar. Por eso "¿qué ardió con menos O₂ que en la Tierra?" no se contesta con PSI; solo con un artículo citado (el de PMMA, BASS-II: 17 % frente a 18 %, **un solo material**).
- **Ninguna prueba cubre la atmósfera lunar prevista** (O₂ ≥ 30 % a ≤ 10.2 psi): de las 274 pruebas de FLEX, **0** cumplen las dos condiciones. BASS-II no registra presión y su O₂ máximo es 22.2 %. Hay 17 pruebas de FLEX justo por encima del umbral de presión (10.3–10.5 psi): se muestran aparte, **no** se llaman "lunares".
- **Cohetes y propelentes** están fuera del alcance de PSI.
- **El umbral lunar es una expectativa del reto** ("likely 30 % or greater"), no una especificación.

## 4. Frases seguras para el demo
| Digan | No digan |
|---|---|
| "En las condiciones probadas se observó…" | "Los datos muestran que es seguro" |
| "No hay datos de gravedad parcial en PSI" | "En la Luna esto pasaría así" |
| "Sin dato" / "no definido por la fuente" | Rellenar o estimar un valor |
| "Resume y ordena evidencia experimental, con su fuente" | "Nuestra IA predice incendios" |
| "Ninguna prueba cubre la atmósfera lunar prevista" | "Esto sirve directo para la Luna" |

## 5. Autoevaluación (pregúntense en voz alta)
1. ¿Por qué 80 % de extinción en una celda no es "80 % de probabilidad"?
2. ¿Qué pasa si n = 3? ¿Qué muestra la UI?
3. ¿Por qué no podemos decir que el CO₂ solo cambió el resultado?
4. ¿Qué significa `not_stated` en BASS-II?
5. ¿Qué responde el asistente a "¿qué pasa en gravedad lunar?"
6. ¿De dónde salen los 17 % y 18 % de O₂ del PMMA y por qué no los generalizamos?
