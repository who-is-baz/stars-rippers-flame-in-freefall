"""Categoría de alcance "about the site": preguntas sobre la propia página (qué es, cómo se usa, qué significa cada etiqueta).

Se responde DETERMINISTAMENTE: texto fijo en inglés (≤ 600 caracteres) con cifras calculadas de los datos (marcadores {nombre}),
sin modelo y sin herramientas. Cita la sección de la página, no un dataset. Es parte del módulo único de alcance (scope.py):
backend y Basic leen lo mismo (scripts/gen_scope_ts.py genera el espejo de TypeScript).

Los patrones se aplican a texto preparado con prep(): minúsculas, sin acentos, errores comunes corregidos.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Dict, List, Optional

MAX_CHARS = 600

# Errores de ortografía/gramática y abreviaturas frecuentes → forma estándar (se aplican en este orden).
TYPOS = [
    (r"\bhow's\b|\bhows\b|\bhow’s\b", "how is"), (r"\bwhat's\b|\bwhats\b|\bwhat’s\b", "what is"),
    (r"\bthat's\b|\bthats\b", "that is"), (r"\bdon't\b|\bdont\b|\bdo'nt\b", "do not"),
    (r"\bdoesn't\b|\bdoesnt\b", "does not"), (r"\bcan't\b|\bcant\b", "can not"), (r"\bi'm\b|\bim\b", "i am"),
    (r"\bu\b", "you"), (r"\bur\b", "your"), (r"\bpls\b|\bplz\b", "please"), (r"\bwat\b|\bwht\b|\bwhut\b|\bwut\b", "what"),
    (r"\bhw\b|\bhoww\b|\bhwo\b", "how"), (r"\babt\b", "about"),
    (r"\bwebsit\b|\bwebsie\b|\bwensite\b|\bwebpage\b|\bweb page\b|\bwebside\b", "website"),
    (r"\bdashbord\b|\bdashbaord\b|\bdasboard\b|\bdashbard\b", "dashboard"),
    (r"\bfunciton\b|\bfuntion\b|\bfucntion\b|\bfunctions\b|\bfunctioning\b|\bfunctions\b", "function"),
    (r"\bworks\b|\bworking\b|\bwroks\b|\bwrok\b", "work"), (r"\bexplane\b|\bexplian\b|\bexplin\b", "explain"),
    (r"\bmeaning\b|\bmeans\b|\bmeant\b", "mean"), (r"\bwich\b|\bwhcih\b", "which"), (r"\bwere\b(?= does)", "where"),
    (r"\bwher\b|\bwhere's\b|\bwheres\b", "where"), (r"\bpag\b|\bpgina\b|\bpaginas\b", "pagina"),
]


def prep(text: str) -> str:
    t = unicodedata.normalize("NFD", text.lower())
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    for pat, rep in TYPOS:
        t = re.sub(pat, rep, t)
    return re.sub(r"\s+", " ", t).strip()


GREETING_RE = (r"^(hello|hi|hey|hiya|hola|buenas( tardes| dias| noches)?|good (morning|afternoon|evening)|yo|sup|help|ayuda|"
               r"help me|ayudame|start|begin|inicio|menu|please help|hi there|hello there|hola que tal)\W*$")

# (id, sección de la página, patrón sobre texto preparado, texto con {marcadores})
TOPICS: List[Dict[str, str]] = [
    {"id": "ai_numbers", "section": "SI Assistant",
     "re": r"(\b(ai|model|llm|assistant|bot|chatbot|you|answers?)\b.{0,30}\b(make up|made up|invent\w*|hallucinat\w*|fabricat\w*|lie|lies|lying|reliable|trust\w*|accurate|inventa\w*|miente)\b|"
           r"\b(make|made|making) (it )?up\b|\binventa(s|n)? (los )?(numeros|datos|cifras)\b|\bare (the )?(numbers|figures|answers|results) (real|true|correct|made up|accurate)\b|\b(can|do|should) (i|we) trust\b|\bnumeros? (reales|inventados)\b)",
     "text": "No. Numbers never come from the model. Every figure comes from the data tables through fixed queries, and test IDs, citations and "
             "\"No data\" are added by code. If a model's text contains a number that is not in the query result, or a forbidden claim, it is replaced "
             "by a fixed template. In Basic mode no model is used at all."},
    {"id": "assistant", "section": "SI Assistant",
     "re": r"(\bhow\b.{0,25}\b(assistant|asistente|chatbot|bot|you)\b.{0,15}\b(work|function|answer|responde)\b|\b(who|what|quien|que) (are|r|eres|es) (you|tu)\b|\bquien eres\b|\bque eres\b|\byour name\b|\btu nombre\b|"
           r"\bare you (an? )?(ai|bot|robot|human|real|chatgpt|gpt|llm|person)\b|\bwhat is (the )?(si|super intelligence)\b|\b(assistant|asistente|chatbot)\b.{0,20}\b(do|does|for|hace|sirve)\b|"
           r"\bwho (made|built|created|programmed) (you|u)\b|\bquien te (hizo|creo|construyo)\b|\bctrl ?\+? ?k\b|\btell me about yourself\b|\bwhat can you (be|do for me)\b)",
     "text": "I am the SI assistant (SI = Super Intelligence, i.e. an AI/LLM-style helper). In Basic mode I use no model: I match your question to a "
             "precomputed, cited answer from this site's data. The local levels Flash, Medium and Heavy run only on the demo machine, and code checks every "
             "number they write. I answer only about this page and its NASA PSI data. Open me with Ctrl+K."},
    {"id": "limits", "section": "Dashboard and Sources",
     "re": r"(\b(simulat\w*|predict\w*|forecast\w*|prediccion|predice|simula|endors\w*|avalad\w*|respaldad\w*|official|oficial|safety guidance)\b.{0,40}\b(this|it|page|site|dashboard|nasa|esto|pagina|sitio|you)\b|"
           r"\b(is|es) (this|it|esto) (a |an |una )?(simulat\w*|model|official|oficial|prediction)\w*|\b(es|esto es) (una )?(simulacion|prediccion)\b|\b(this|it|page|site|dashboard|esto|pagina|sitio|you|can|puede|does)\b.{0,20}\b(predict\w*|forecast\w*|simulat\w*|predecir|simular|prediccion)\b|"
           r"\b(nasa)\b.{0,25}\b(endors\w*|approv\w*|support\w*|avala\w*|respalda\w*|oficial)\b|\bwhat (it|this) (does not|can not|do not) do\b|\bwhat does (it|this|the page|the site) not do\b|\blimitations?\b|\blimites\b|\blimitaciones\b|\bis (this|it) (real|official|safe to trust)\b)",
     "text": "This page does not simulate or predict anything. The flame picture is an illustration, FLEX extinction percentages are descriptive (not probabilities), "
             "and there are no partial-gravity or normal-gravity tests: every test is microgravity on the ISS. It is an independent student project, not endorsed "
             "by NASA and not safety guidance."},
    {"id": "unverified", "section": "Scenarios and the dock",
     "re": r"\bunverified\b|\bnot verified\b|\bsin verificar\b|\bno verificad\w*\b|\bunconfirmed\b|\bverified source\b|\bverificad\w*\b",
     "text": "\"Unverified source\" marks an atmosphere (NASA lunar habitat, Exploration Atmosphere, spacesuit) whose cited NASA value has not been confirmed "
             "by a team member yet. The test counts shown are still real; only the atmosphere definition is unconfirmed. Earth / ISS and the challenge's Moon base air are verified."},
    {"id": "small_n", "section": "Coverage and the cards",
     "re": r"\bn ?< ?5\b|\bn ?(is )?(less|lower|below|under|smaller) (than )?5\b|\bsmall (sample|n)\b|\bfew tests\b|\b(grey|gray) cells?\b|\bcells? (are |is )?(grey|gray)\b|\bsample size\b|\bwhat (does|is) n\b|\bque (es|significa) n\b|\bmuestra pequena\b|\btamano de (la )?muestra\b|\bwhat is the n\b|\bn value\b",
     "text": "n is the number of tests behind a figure. \"n<{min_n}\" means fewer than {min_n} tests: the percentage or average is unstable and must not be read as a rate, "
             "so those cells are grey and carry a warning. A figure is never shown without its n."},
    {"id": "exact_near", "section": "Dashboard cards and Scenarios",
     "re": r"\bexact\b.{0,25}\bnear\b|\bnear\b.{0,25}\bexact\b|\bexact match\w*\b|\bnear match\w*\b|\bcercan\w*\b|\bexactas?\b|\btolerance\b|\btolerancia\b|\bwithin tolerance\b|\bwhat (does|do) (near|exact)\b|\bnear (tests|conditions)\b",
     "text": "Exact matches meet an atmosphere's criterion strictly; near matches fall within the tolerance (±{tol_o2}% oxygen and ±{tol_psi} psi). For the Moon base air "
             "there are {n_moon_exact} exact and {n_moon_near} near tests. \"Near\" does not mean lunar: every test is microgravity on the ISS."},
    {"id": "not_stated", "section": "Materials and Experiments table",
     "re": r"\bnot[_ ]stated\b|\bno declarad\w*\b|\boutcome (is )?not stated\b|\bwhy (are )?(so many|most) (outcomes|tests).{0,20}(empty|unknown|not stated)\b",
     "text": "In BASS-II, \"not stated\" means the source notes do not say how a test ended. It does not mean the flame did not go out, and no extinction percentage is "
             "computed for BASS-II. Outcomes read from free-text notes by AI are labelled \"AI-extracted\" and await human review."},
    {"id": "custom", "section": "Dashboard, Custom",
     "re": r"\bcustom\b|\bpersonaliz\w*\b|\bmy own (settings|conditions|values|numbers)\b|\bset (my|the) own\b|\bsliders?\b|\bdeslizadores?\b|\bchoose (my )?(fuel|oxygen|pressure)\b|\belegir (combustible|oxigeno|presion)\b",
     "text": "Custom (next to the atmosphere cards) lets you pick fuel, oxygen, pressure and suppressant. It shows the FLEX tests observed within the tolerance "
             "(±{tol_o2}% O2, ±{tol_psi} psi) with their n, outcomes and means. If no test is close it says so and offers the closest tested conditions. It never interpolates or predicts."},
    {"id": "mode", "section": "Top bar",
     "re": r"\bexplorer\b.{0,12}\bengineer\b|\bengineer (mode|view)\b|\bexplorer (mode|view)\b|\bwhat (is|are) (the )?(explorer|engineer)\b|\bmodo (explorer|engineer)\b|\bexplorer or engineer\b",
     "text": "Explorer and Engineer (top right) change how the cards explain things: Explorer uses plain language, Engineer adds technical detail such as quality flags and counts. "
             "The data and the numbers are the same in both."},
    {"id": "coverage", "section": "Coverage",
     "re": r"\bcoverage\b|\bcobertura\b|\bheat ?map\b|\bmapa de cobertura\b|\bempty cells?\b|\bcells? (are|is) (empty|grey|gray)\b|\bceldas? vacias?\b|\bwhat is (the )?(map|grid)\b",
     "text": "Coverage is a map of FLEX conditions (fuel × oxygen band × pressure level): {n_cells_tested} of {n_cells} cells have tests. An empty cell means no data, "
             "not zero, and cells with n<{min_n} are grey. Open it from the top bar."},
    {"id": "gaps", "section": "Gaps",
     "re": r"\bgaps?\b|\bbrechas?\b|\bwhat is missing\b|\bwhat (data )?(is|are) (not|missing)\b|\bdoes not (cover|include|have)\b|\blagunas?\b|\bque falta\b|\bwhat can not\b|\bwhat (do|does) (the|these) data not\b",
     "text": "Gaps lists what the data does not cover: no partial-gravity or normal-gravity tests, no FLEX test below {gap_psi_min} psi or above {gap_o2_max_pct}% oxygen, "
             "and BASS-II has no recorded pressure. Each gap shows its evidence. Open it from the top bar."},
    {"id": "scenarios", "section": "Dock and Scenarios view",
     "re": r"\bscenarios?\b|\bescenarios?\b|\breference atmospheres?\b|\bwhat are the atmospheres\b|\batmosferas\b|\bdock\b|\bbottom (bar|dock|buttons?)\b|\bbuttons? at the bottom\b",
     "text": "Scenarios are reference atmospheres: Earth / ISS air, Moon base (from the challenge text), NASA lunar habitat, Exploration Atmosphere and spacesuit. "
             "For each, the page counts the FLEX tests that match exactly and nearby. Some are labelled \"Unverified source\"."},
    {"id": "flex", "section": "Experiments table and Coverage",
     "re": r"(\bwhat (is|are)|\bque (es|son)|\btell me about|\bexplain|\bdefine)\b.{0,12}\b(flex|psi-?69|flame extinguishment)\b|\b(flex|psi-?69)\b.{0,25}\b(mean|stand|stands|significa|is short for)\b",
     "text": "FLEX (Flame Extinguishment Experiment, PSI-69) burned heptane and methanol droplets on the ISS in mixes of oxygen, nitrogen, CO2 and helium. "
             "The page has {n_flex} FLEX tests; each records oxygen, pressure, outcome (extinction, disruption or completion), burning rate and extinction diameter."},
    {"id": "bass2", "section": "Materials",
     "re": r"(\bwhat (is|are)|\bque (es|son)|\btell me about|\bexplain|\bdefine)\b.{0,12}\b(bass-?2?|bass-?ii|psi-?25|burning and suppression)\b|\b(bass-?2?|bass-?ii|psi-?25)\b.{0,25}\b(mean|stand|stands|significa|is short for)\b",
     "text": "BASS-II (Burning and Suppression of Solids II, PSI-25) burned solid samples such as PMMA rods, films and sheets, fabrics and a candle in an air flow on the ISS. "
             "The page has {n_bass} BASS-II tests. It records oxygen but no pressure, and many outcomes are not stated."},
    {"id": "data_source", "section": "Sources",
     "re": r"\bwhere (does|do|did|is|are|was|were) (the )?(data|numbers|figures|tests?)\b.{0,15}\b(come|comes|from|came|collected|obtained)\b|\bwhere (the )?(data|numbers|figures) (come|comes|is from|are from)\b|\bdonde (vienen|salen|sacan|se obtienen)\b.{0,20}\b(datos|cifras|numeros)\b|\bdata ?source\b|\bsource of (the )?(data|numbers)\b|\bfuente de (los )?datos\b|\bwho (collected|measured|ran)\b|"
           r"\blicen[sc]e\b|\bcc0\b|\bdoi\b|\bwhat is (nasa )?psi\b|\bque es psi\b|\bphysical sciences informatics\b|\bhow (was|were) the data\b|\bcomo se (obtuvo|obtuvieron)\b|\bwhere is the data\b|\bwhere do (the )?(numbers|tests) come\b|\bde donde (vienen|salen|sacan)\b",
     "text": "Data: NASA Physical Sciences Informatics (PSI), license CC0-1.0. FLEX (PSI-69, DOI {doi_flex}) has {n_flex} fuel-droplet tests and BASS-II (PSI-25, DOI {doi_bass}) "
             "has {n_bass} solid-material tests. All were run in microgravity on the ISS. Every figure on the page is computed from these tables."},
    {"id": "site", "section": "Dashboard",
     "re": r"\bwhat (is|are) (this|the|that) (page|site|website|dashboard|app|tool|project|thing)\b|\bwhat is this\b|\bque es (esto|esta|este)\b|\bwhat (is )?(this|the) (page|site|website|dashboard) (for|about|do|does|is)\b|\babout (this|the) (page|site|website|dashboard|project)\b|"
           r"\btell me about (this|the) (page|site|website|dashboard|project)\b|\bpurpose\b|\bproposito\b|\bobjetivo\b|\bpara que (es|sirve) (esta|este|esto)\b|\bwhat does (this|the) (page|site|dashboard) do\b|\boverview\b|\bwhat is going on\b|\bexplain (this|it)\W*$|\bquick intro\b|\bintroduction\b|\bintro\b|\bwhat is it\b|\bwhat am i (looking at|seeing)\b|\bwhat do i see\b",
     "text": "This page is an evidence dashboard for NASA microgravity combustion data: {n_tests} tests from NASA PSI ({n_flex} FLEX fuel-droplet tests and {n_bass} BASS-II solid-material tests), "
             "organised by cabin atmosphere (oxygen and pressure). Pick an atmosphere in the bottom dock, open other views from the top bar, or ask me. It shows observed tests only."},
    {"id": "relevance_order", "section": "Experiments",
     "re": r"\brelevan\w*\b.{0,30}\b(order|sort|rank|ordered|sorted|ranked|computed|calculated|work|works|mean|formula|score)\b|\b(order|sort|rank|ordered|sorted|ranked|formula)\b.{0,30}\brelevan\w*\b|\bhow (are|is) (the )?(tests|experiments|results|rows).{0,15}(ordered|sorted|ranked)\b|\brelevance (order|formula|ranking)\b",
     "text": "In Experiments, tests are ordered by relevance to the selected atmosphere: Exact, then Near, then Not near, then tests with no recorded pressure. Within a class the order is the distance "
             "max(|ΔO₂| / {tol_o2}% , |Δpsi| / {tol_psi} psi), then a declared outcome, then larger n. It orders records by closeness of conditions; it is not a safety ranking."},
    {"id": "complete_partial", "section": "Dashboard indicators",
     "re": r"\b(complete|partial)\b.{0,25}\b(test|tests|record|records|mean|means|definition|data|experiments?)\b|\bwhat (does|is|are) (complete|partial)\b|\b(tests?|records?|experiments?)\b.{0,15}\b(are|is) (complete|partial)\b|\bhow many\b.{0,20}\b(complete|partial)\b|\bcomplete (vs|versus|or|and) partial\b|\bcompleto\b|\bparcial\b",
     "text": "Complete = a declared outcome plus the key fields of its investigation (FLEX: fuel, O₂, pressure and a measured burning rate or extinction diameter; BASS-II: material, O₂ and a declared outcome). "
             "Partial = one of them is missing. {n_complete} of {n_tests} tests are complete and {n_partial} partial; {n_complete_ai} of the complete ones have AI-extracted outcomes."},
    {"id": "scenario_coverage", "section": "Dashboard indicators",
     "re": r"\bscenario coverage\b|\bcoverage of (the )?(scenario|atmosphere)\b|\bgroups? with at least one test\b|\bwhat is (the )?(x of y|coverage percentage)\b",
     "text": "Scenario coverage = X of Y fuel and material groups with at least one test within ±{tol_o2}% O₂ and ±{tol_psi} psi of the selected atmosphere (FLEX fuels on O₂ and pressure, BASS-II material categories on O₂ only). "
             "It counts available records; it is not a safety score."},
    {"id": "no_evidence", "section": "Dashboard indicators and Gaps",
     "re": r"\bwithout evidence\b|\bno evidence\b|\bconditions? (with(out)? |lacking )?evidence\b",
     "text": "Conditions without evidence: {n_empty_cells} of {n_cells} cells of the FLEX grid (fuel × O₂ band × pressure level) have no test. For the selected atmosphere the strip also counts fuel × suppressant "
             "combinations with no test within tolerance. Open Gaps for the details."},
    {"id": "unresolved", "section": "Dashboard, interpretation card",
     "re": r"\bunresolved\b|\buncertaint\w*\b|\bopen questions?\b|\bwhat (is|are) (still )?(unknown|uncertain)\b",
     "text": "\"What remains unresolved\" (third block of the interpretation card) lists what the data cannot settle for the selected atmosphere: no exact tests, small n, CO₂ and He confounded with O₂, an unverified source, "
             "BASS-II outcomes not stated, microgravity on the ISS only, samples unlike a habitat, and records of past tests only. Each item links to Gaps or Methods."},
    {"id": "experiments_view", "section": "Experiments",
     "re": r"\bexperiments?\b.{0,15}\b(tab|view|page|section|screen|table)\b|\bwhat is (the )?experiments\b|\bexplore tests\b|\bwhat (can|do) i (do|see) (in|on) (the )?experiments\b",
     "text": "Experiments lists all {n_tests} tests, ordered by relevance to the selected atmosphere, with search, filters (investigation, fuel or material, O₂ and pressure ranges, declared outcome, complete or partial, "
             "n, AI-extracted, relevance) and a detail panel per test. Filters are kept in the page address."},
    {"id": "views", "section": "Top bar and dock",
     "re": r"\b(what|which|que|cuales)\b.{0,25}\b(views?|sections?|tabs?|pages?|screens?|menus?|vistas?|secciones|pestanas)\b|\bnavigation\b|\bnavigate\b|\bnavegar\b|\bmenu\b|\btop bar\b|\bbarra superior\b|\bwhat (does|do|is) (each|every) (view|tab|section|button)\b|\bwhat is (the )?dashboard\b|\bwhat is (the )?(experiments?|charts?|materials?|sources?) (view|tab|section)\b",
     "text": "Views: Dashboard (atmosphere cards and the flame picture), Coverage (which conditions have tests), Gaps (what the data does not cover), and full views from the top bar: "
             "Experiments table, Charts, Scenarios, Fuels, Materials and Sources. Explorer/Engineer changes how much detail the cards give, and Custom lets you set your own conditions."},
    {"id": "howto", "section": "Dashboard",
     "re": r"\bhow (do|can|should|to) (i|we|you)\b.{0,10}\b(use|start|read|navigate|begin|operate|understand|interpret|get started)\b|\bhow to use\b|"
           r"\bhow (is|does|do|are) (this|it|that|the \w+( \w+)?).{0,6}\b(work|function|operate)\b|\bhow it work\b|\bhow is it work\b|\bhow (do|does) (this|it) work\b|"
           r"\bcomo (se )?(usa|uso|funciona|empiezo|navego|leo|se lee)\b|\bcomo funciona\b|\binstructions?\b|\btutorial\b|\bguide\b|\bgetting started\b|"
           r"\bi do not (know|understand|get)\b|\b(new here|first time|beginner|newbie|i am lost|i am confused|confused|lost)\b|\bprimera vez\b|\bguia\b|\bun tour\b|\bthe tour\b|\bpara que sirve\b|\bexplain (how|this|the page|the site|the dashboard)\b|\bwalk me through\b|\bstep by step\b|\bpaso a paso\b|\bno entiendo\b|\bno se (como|que|usar)\b|\bhow (do|can) i\b.{0,20}\b(this|it|page|site|dashboard)\b",
     "text": "How to use it in 3 steps: 1) Pick an atmosphere in the bottom dock (for example Earth / ISS or Moon base), or press Custom to set oxygen, pressure and fuel yourself. "
             "2) Read the cards: each shows how many tests are near (n), how they ended, and its source. 3) Open Coverage or Gaps to see what is missing, or ask me about the data. "
             "New here? Press Tour (top left, under SI insights) for a short guided tour."},
    {"id": "capabilities", "section": "SI Assistant",
     "re": r"\bwhat can (i|you)\b.{0,15}\b(ask|do|answer|help|tell)\b|\bwhat (do|should) i (ask|do|try)\b|\bwhat to ask\b|\bhow can you help\b|\bcan you help\b|\bhelp me\b|\bi need help\b|\bnecesito ayuda\b|\bque puedo\b|\bque puedes\b|\bcomo me puedes ayudar\b|"
           r"\b(sample|example|suggested) questions?\b|\bexamples? of questions?\b|\bsuggest\w*\b|\bwhat (are )?you good (for|at)\b|\bwhat is your (purpose|job|role)\b",
     "text": "I can explain this page and answer questions about the NASA PSI combustion data it shows ({n_tests} ISS tests). Try one of the questions below."},
]

# Los temas de indicadores/vistas (mentora) van antes de "custom"/"coverage"/"gaps" para que "scenario coverage" no caiga en "coverage".
_EARLY = ["relevance_order", "complete_partial", "scenario_coverage", "no_evidence", "unresolved", "experiments_view"]
_early = [t for t in TOPICS if t["id"] in _EARLY]
_rest = [t for t in TOPICS if t["id"] not in _EARLY]
_at = next(i for i, t in enumerate(_rest) if t["id"] == "custom")
TOPICS[:] = _rest[:_at] + _early + _rest[_at:]

# Duda razonable sobre la propia página → "site". Requiere un sustantivo de la página Y una palabra de pregunta/acción.
GENERIC_NOUN_RE = r"\b(page|pagina|site|sitio|website|web|dashboard|tablero|app|application|aplicacion|tool|herramienta|interface|interfaz|screen|pantalla|assistant|asistente|chatbot)\b"
GENERIC_VERB_RE = (r"\b(how|what|where|why|which|who|help|explain|use|usar|work|function|mean|show|does|can|como|que|donde|por que|cual|quien|ayuda|explica|funciona|significa|sirve|"
                   r"understand|entiendo|learn|know|see|read|find|click|open)\b")

SUGGESTIONS = [
    "What is this page?",
    "How do I use it?",
    "Which tests match Earth / ISS cabin air (21% O2, 14.7 psi)?",
    "What happens to a fire in lunar gravity?",
]
REFUSAL_HINT = "Try one of these questions:"

_COMPILED = [(t, re.compile(t["re"], re.I)) for t in TOPICS]
_GREETING = re.compile(GREETING_RE, re.I)
_NOUN, _VERB = re.compile(GENERIC_NOUN_RE, re.I), re.compile(GENERIC_VERB_RE, re.I)
_BY_ID = {t["id"]: t for t in TOPICS}
_BY_ID["greeting"] = {"id": "greeting", "section": "SI Assistant", "text": ("Hello! " + _BY_ID["capabilities"]["text"])}


def match_topic(question: str) -> Optional[str]:
    """Id del tema "about" explícito, o None."""
    t = prep(question)
    if _GREETING.search(t):
        return "greeting"
    for topic, rx in _COMPILED:
        if rx.search(t):
            return topic["id"]
    return None


def generic_site(question: str) -> bool:
    t = prep(question)
    return bool(_NOUN.search(t) and _VERB.search(t))


def key(question: str) -> str:
    """Clave para comparar con las preguntas sugeridas: sin acentos, minúsculas, solo letras y números."""
    return re.sub(r"[^a-z0-9]+", " ", prep(question)).strip()


def render(topic_id: str, facts: Dict[str, object]) -> str:
    text = _BY_ID[topic_id]["text"]
    for k, v in facts.items():
        text = text.replace("{" + k + "}", str(v))
    return text


def section(topic_id: str) -> str:
    return _BY_ID[topic_id]["section"]
