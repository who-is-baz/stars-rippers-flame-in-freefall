# Tareas · Fer (Datos y validez)

Eres el dueño de que lo que mostremos sea **cierto**. Es el criterio *Validity* del jurado.

## Primero (hoy, antes de las 11:15)
1. Revisa `docs/material_mapping_proposal.csv` (49 textos → 7 categorías). Responde:
   - ¿Varillas transparentes y negras en una sola categoría (con color aparte)? Propuesta: sí.
   - ¿Corte película/lámina en 0.4 mm / 1 mm? Propuesta: sí (no hay espesores intermedios).
   - Confirma los 5 textos que no dicen "PMMA": B3, B5, B7, B12, B13.
2. Anota tu aprobación en `docs/DECISIONES.md` y avisa a Baz. **Esto bloquea el esquema final.**

## Después
3. Revisa a mano las **26 extracciones de resultado de BASS-II hechas por IA** (columnas `ai_*`; el CLI ya corrigió 4 errores, pero lo revisó la misma IA). Marca las que apruebas.
4. Revisa los `qc_flags` (O₂ final imposible en P22a/P22b y B2, fechas incoherentes en T9/T18, presión 0.0 en C11M201, discrepancia 20CAL10, 14 pruebas "completion" con diámetro, ID duplicado 193F001). Decide cómo se muestran.
5. Valida estas interpretaciones antes del demo:
   - ¿"Diámetro de extinción menor" = llama más persistente? (base del ranking)
   - La tendencia tasa de combustión vs O₂ (docs/03).
6. Define los pesos por defecto del ranking.
7. Escribe `docs/glosario.md` (términos de combustión, cada uno con fuente). Sin fuente, no entra.
8. (Opcional) Busca qué significa "Disruption" en publicaciones de FLEX. Si no aparece, se queda "no definido".

## Listo cuando
Aprobación registrada, flags decididos, 3 afirmaciones validadas para el demo.
