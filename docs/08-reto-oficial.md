# 08 · Reto oficial: Flame in Freefall (NASA Space Apps 2026)

> Fuente: página oficial del reto en spaceappschallenge.org (copiada por Baz el 14 nov 2026, 11:30; el primer renglón del texto pegado llegó cortado). Dificultad: Advanced/Intermediate. Tema: Space Exploration. **No está aquí la pestaña Resources ni Teams:** pendiente de pegar (puede traer más datos).
> El texto oficial completo está al final, sin modificar. La primera parte es nuestra lectura, para decidir alcance.

## Qué pide el reto (en una línea)
Un **dashboard web impulsado por SI** que **resume, ordena (rank) e interpreta** investigaciones de combustión en microgravedad de NASA PSI para dar **ideas de seguridad contra incendios** en exploración humana.

Objetivos que se pueden atender (el reto dice "puede considerar", no obliga):
1. **Identificar las investigaciones más relevantes** para los entornos habitables de la tripulación: nave, estación, bases lunares/marcianas, rovers presurizados.
2. **Extraer datos que sirvan para modelado predictivo** de flamabilidad y escenarios de incendio.
3. **Resaltar investigaciones** que informen controles y equipo de seguridad contra incendios de nueva generación.
4. Opcional: **aplicaciones en la Tierra** (p. ej. nebulizadores de agua fina, detección de humo, equipo de bomberos).

Público: profesores, posgrado, licenciatura, investigadores e ingenieros aeroespaciales → UI técnica, en inglés.

## Lo que esto implica para nuestro plan
| Hecho del reto | Implicación |
|---|---|
| Pide **resumir, ordenar y comparar investigaciones**, no solo experimentos sueltos. | Nuestro núcleo son 2 investigaciones (FLEX, BASS-II). Falta una vista de **catálogo de investigaciones** (las 24 de Combustion Science que ya listamos) con metadatos y **un ranking explícito**. Ver issue de catálogo/ranking. |
| "Rank" por relevancia para entornos habitables. | El ranking debe ser **transparente y reproducible** (criterios visibles, pesos fijos, sin que el LLM invente el orden) y etiquetado como **heurística del equipo, no de NASA**. |
| Atmósfera lunar prevista: **O₂ ≥ 30 % a ≤ 10.2 psi** (≈0.70 atm). Spacesuit: 100 % O₂ a 4.3 psi. | Filtro de datos **"condiciones relevantes a hábitat lunar"** (O₂ ≥ 0.30 y presión ≤ 0.70 atm) y mostrar cuántas pruebas lo cumplen. Si hay pocas, **decirlo**: es un hallazgo honesto. |
| "Extraer datos que apoyen el modelado predictivo." | Significa **dar los datos limpios y exportables**, no que nosotros construyamos el modelo. Mantener "sin modelo predictivo" y añadir **exportación CSV** de lo filtrado (con DOI y flags). |
| **No hay datos de gravedad parcial en PSI** (LUCI y FM2 vendrán después). E-FIELD de ACME *imita* gravedad parcial con campo eléctrico. | La pregunta trampa "¿qué pasa en gravedad lunar?" debe responder `no_data`, **mencionando** que E-FIELD es solo un análogo. Ver `local-llm-rag`. |
| Fuego en **cohetes/propelentes** está fuera de alcance. | Segunda pregunta trampa → `no_data` con motivo. |
| FLEX = gotas de combustible líquido (MDCA/CIR) con **supresión por CO₂ y helio**. BASS/BASS-II = materiales sólidos en el MSG con ducto de flujo. | Etiquetar en la UI el **tipo de combustible y el hardware** de cada investigación. Los resultados de FLEX hablan de **supresión**; los de BASS-II, de **flamabilidad de materiales**. No mezclar conclusiones. |
| Otras investigaciones relevantes: **Saffire-I/II/III** (incendios de materiales), **SAME/SAME-R** (detección de humo), **DAFT/DAFT-2** (polvo), **SPICE, SLICE**, **ACME** (6 experimentos de gases, incl. BRE y CFI-G con hasta 85 % O₂). | Candidatas al catálogo. Profundizar solo en FLEX y BASS-II; las demás aparecen con metadatos y enlace, **sin cifras que no hayamos verificado**. |
| El reto menciona el mensaje de "SI" (Super Intelligence). | En entrega y UI usar **"SI"** como lo hace NASA (y aclarar "AI/LLM" una vez). |

## Resumen de alcance sugerido (a validar con `scope-guard`)
1. **Mantener:** dashboard FLEX/BASS-II, 6 consultas parametrizadas, asistente anclado con `no_data`.
2. **Añadir (ligero):** (a) catálogo de investigaciones con metadatos; (b) ranking por criterios visibles; (c) filtro "condiciones lunares"; (d) exportación CSV.
3. **No hacer:** modelo predictivo, SQL libre, cifras de investigaciones no verificadas.

---

## Texto oficial (sin modificar)

lame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data
Join the Challenge
DetailsResourcesTeams
Event
2026 NASA Space Apps Challenge
Difficulty
Advanced
Intermediate
Subjects
Space Exploration
For decades, NASA has studied how flames and fire behave in microgravity, gathering a trove of experimental data along the way. That knowledge matters more than ever as humans gear up to return to the Moon and press on to Mars, yet the volume of results makes them hard to find, compare, and understand. Your challenge is to create an interactive, super intelligence (SI) powered dashboard that summarizes, ranks, and interprets those findings to deliver fire safety insights for human space exploration.


Background
Fire hazards are extremely dangerous in space exploration! In describing a smoke alarm that went off during the recent Artemis II mission, the commander commented, “[If] you want to get somebody’s attention really quick, make the fire alarm go off in your spacecraft when you’re still about 80,000 miles from home.” Decades earlier, the Apollo 13 crew endured the life-threatening results of an oxygen tank explosion on their way to the Moon. Similarly, a multinational crew survived a fire aboard the Mir space station caused by an oxygen generator failure. In 1967, the Apollo 1 crew died in a pre-launch test when fire erupted in their oxygen-filled spacecraft.

Compared to Earth, flames in free fall (i.e., in microgravity) are often dramatically different because of the absence of buoyancy and thus rising hot gases. Instead of a flickering teardrop, a candle flame becomes a ghostly blue sphere reliant on diffusion for its oxygen.

NASA’s spacecraft fire safety work is focused on prevention, detection, and suppression. Prevention is achieved by controlling ignition sources and through material selection, which depends on understanding flammability limits. To facilitate spacesuit use, an atmosphere with increased oxygen and reduced pressure compared to Earth’s is expected within the planned Moon Base and pressurized rovers. Flammability is highly dependent on oxygen concentration, and air flow is also important in microgravity. Flammability studies focus on solid materials such as fabrics and plastics, as studied in the Burning and Suppression of Solids (BASS and BASS-II) and Spacecraft Fire Safety Demonstration (Saffire-I, -II, and -III) investigations.

Fire detection was tested in microgravity through the Smoke and Aerosol Measurement Experiment studies (SAME and SAME-R). Suppression was studied in the Flame Extinguishment Experiment (FLEX) through dilution of the chamber atmosphere with carbon dioxide and helium, both of which suppress fire.

Objectives
Results from low-gravity combustion experiments, conducted for example on the International Space Station (ISS), are being made publicly available through NASA's Physical Science Informatics (PSI) database, but the amount of data can be overwhelming. It can be hard to find, harder to compare, and harder yet to interpret.

Your challenge is to build an SI-powered, web-based dashboard that summarizes, ranks, and interprets combustion science investigations to deliver critical foundational insights for fire safety. You may consider enabling users to:

Identify investigations most relevant to the fire safety needs of habitable crew environments, including spacecraft, space stations, bases on the lunar and Martian surfaces, and pressurized rovers.*
Extract data that supports predictive modeling of flammability and fire scenarios in space exploration.
Highlight research that informs the development of next-generation fire safety controls and equipment.
In this challenge, you’ll help turn complex data into clear answers and make the next giant leap a safer one.

Your dashboard could also address potential applications of the PSI data to fire safety on Earth. Fine-water-mist extinguishers developed for use on the ISS have practical applications here on Earth, and NASA technology has similarly led to improvements in terrestrial smoke detection and firefighter gear, including protective clothing and air tanks.

*Fire safety involving rockets and propellants is generally beyond the scope of the research available in the PSI database. The high velocities within rocket engines render the combustion effectively independent of gravity — although a rocket’s launch is of course strongly dependent on gravity.

Potential Considerations
You may (but are not required to) consider the following:

Your target audience can include professors, graduate students, undergraduate students, aerospace researchers, and aerospace engineers.
Consider how you might summarize and display attributes such as:
Experimental objectives
Fuels, including shape and size of the samples or burners
Other test conditions, such as oxygen concentration and airflow speed
Variables: how did tests from the same investigation differ and how were they the same?
Sensors or types of measurements
Consider how to summarize and display similarities and differences between different investigations.
Other investigations in PSI
One of the instruments used for smoke detection in the SAME and SAME-R studies was instead used to detect dust in the Dust and Aerosol Measurement Feasibility Test (DAFT and DAFT-2) studies.
While it burned gaseous fuels, the Burning Rate Emulator (BRE) experiment of the Advanced Combustion via Microgravity Experiments (ACME) project was a study of materials flammability in still atmospheres as a function of material properties.
Other combustion investigations within the PSI database (but not explicitly referenced above) are still relevant to fire safety, just not as strongly or directly.
Hardware
The six experiments in the ACME project featured flames of gaseous fuels and were all conducted with the same modular set of ACME hardware in the Combustion Integrated Rack (CIR).
FLEX, FLEX-2, and the Cool Flames Investigation (CFI) each featured burning droplets of liquid fuel and were conducted with the Multi-user Droplet Combustion Apparatus (MDCA) in the CIR.
BASS, BASS-II, the Smoke Point In Co-flow Experiment (SPICE), and the Structure & Liftoff In Combustion Experiment (SLICE) collectively featured both solid and gaseous fuels. Each of these investigations was conducted within the Microgravity Science Glovebox (MSG) using the modular fan-driven flow duct built for SPICE.
Spacesuits and oxygen concentration
To enable flexibility, spacesuits are filled with 100% oxygen to only 4.3 psi (pounds per square inch), where the Earth’s pressure at sea level is 14.7 psi.
To avoid the bends (decompression sickness), the astronauts pre-breathe 100% oxygen to expel absorbed nitrogen.
To reduce the pre-breathing duration and thus facilitate lunar excursions, it is expected that the Moon Base and pressurized rover(s) will be at a pressure and oxygen concentration between those in a spacesuit and the Earth’s atmosphere.
The intermediate oxygen concentration used on the Moon will likely be 30% or greater, with a corresponding pressure of 10.2 psi or less. Compared to Earth’s atmosphere, that’s more than a 40% increase in the oxygen concentration making materials much more flammable.
Microgravity tests with the highest oxygen concentrations were conducted as part of the ACME’s Cool Flames Investigation with Gases (CFI-G). In those tests, the combustion chamber was filled with a mixture of nitrogen and a flammable gas (e.g., propane), while an oxygen-nitrogen mixture of up to 85% oxygen flowed from the spherical burner creating an inside-out flame.
Partial-gravity data
Although NASA is heavily focused on the return of astronauts to the Moon’s surface and the establishment of a Moon Base in preparation for the future human exploration of Mars, there is currently no partial-gravity combustion data available in PSI. We expect such data will be added in the future, for example from the Lunar-g Combustion Investigation (LUCI) and the Flammability of Materials on the Moon (FM2) experiment.
Partial gravity was mimicked in ACME’s Electric-Field Effects on Laminar Diffusion Flames (E-FIELD Flames) experiment through the effect of the electric field on the ions that naturally occur in flames.
Microgravity and normal-gravity results could bound what occurs at intermediate gravity levels.
For data and resources related to this challenge, refer to the Resources tab at the top of the page. More resources may be added before the hackathon begins.