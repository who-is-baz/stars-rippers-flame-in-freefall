"""Alcance del asistente: UN solo lugar. Lo que no sea sobre los datos PSI del sitio recibe la negativa fija y NO llega al modelo.

Temas permitidos: pruebas FLEX/BASS-II, atmósferas (O2, presión), combustibles, supresores, cobertura, brechas,
escenarios y su verificación, procedencia de los datos. Todo lo demás (cultura general, código, opinión, política,
otras misiones, jailbreaks, roleplay, pedir el prompt, traducir, resumir textos ajenos, matemáticas) → REFUSAL.
El espejo del front está en frontend/src/assistant/engine.ts; ambos leen los mismos casos de
frontend/src/assistant/scope_cases.json (pruebas de paridad).
"""
from __future__ import annotations

import re
import unicodedata

REFUSAL_TEXT = "I can only answer questions about the NASA PSI combustion data shown on this site."

_ZERO_WIDTH = dict.fromkeys(map(ord, "​‌‍⁠﻿­"), None)


def normalize(question: str) -> str:
    """NFKC, sin caracteres de control/ancho cero, espacios colapsados. Es lo único que ve el router/regex."""
    q = unicodedata.normalize("NFKC", question).translate(_ZERO_WIDTH)
    q = "".join(ch if (ch.isprintable() or ch in "\n\t") else " " for ch in q)
    return re.sub(r"\s+", " ", q).strip()


TOPIC_RE = re.compile(
    r"(flex|bass|psi\b|nasa|\bdata(set)?\b|datos|experiment|\btests?\b|\bruns?\b|prueba|ensayo|\btest\s*id|"
    r"o2|o₂|oxygen|ox[ií]geno|pressure|presi[oó]n|\bpsi\b|\batm\b|atmosph|atm[oó]sfera|cabin|cabina|"
    r"heptan|methanol|metanol|fuel|combustible|droplet|gota|supress|supres|co2|co₂|helium|helio|\bhe\b|diluent|"
    r"extinct|extingu|apaga|put out|burn|quem|flame|llama|fire|fuego|incendio|ignit|blow-?off|disrupt|complet|"
    r"coverage|cobertura|\bgaps?\b|brecha|falta|missing|scenario|escenario|verified|verific|unverified|source|fuente|doi|"
    r"cite|citation|cita|materials?|pmma|fabric|tela|aramid|cotton|candle|solid|nomex|sibal|"
    r"moon|lunar|luna|mars|marte|iss\b|space station|microgravity|microgravedad|gravity|gravedad|habitat|spacesuit|suit|eva\b|"
    r"exploration|tolerance|tolerancia|qc|flag|n\s*<\s*5|extraction|extra[ií]d|ai-extracted|not[_ ]stated)", re.I)

# Tareas ajenas aunque mencionen una palabra del tema ("traduce el dataset", "escribe código para…").
DISALLOWED_RE = re.compile(
    r"(translat|traduc|summari[sz]e (this|the following|that|these)|resume (este|el siguiente)|"
    r"write (me )?(a |an |some )?(poem|code|script|essay|story|song|email|program|function)|escribe (un |una )?(poema|c[oó]digo|ensayo|cuento|canci[oó]n|programa|funci[oó]n)|"
    r"\b(python|javascript|typescript|java|c\+\+|html|css|regex|bash|shell)\b.*\b(code|script|function|program|c[oó]digo)\b|"
    r"role-?play|pretend|imagine you are|you are now|from now on you|finge|act[uú]a como|haz de cuenta|"
    r"\bjoke\b|chiste|poem|poema|recipe|receta|horoscope|lottery|weather|clima|stock price|bitcoin|crypto|"
    r"election|elecci[oó]n|president|presidente|politic|pol[ií]tic|religion|football|f[uú]tbol|movie|pel[ií]cula|"
    r"capital (of|de)|who (is|was|won)|qui[eé]n (es|fue|gan[oó])|what is the meaning|"
    r"solve|integral|derivative|equation|ecuaci[oó]n|\bcalculate\b.*\b(tip|tax|loan|mortgage)\b|"
    r"\b\d+\s*[-+*/x×÷^]\s*\d+\s*(=|\?)|what is \d+\s*[-+*/x×÷^]\s*\d+|"
    r"apollo|artemis|spacex|starship|iss (crew|astronaut)|astronaut|astronauta|mission to)", re.I)

INJECTION_RE = re.compile(
    r"(ignor(e|a|ar)\b.{0,30}\b(instruc|rules|reglas|prompt|previous|above|anteriores)|disregard|forget (all|your|the|everything)|olvida (tus|las|todo)|"
    r"system prompt|prompt del sistema|your (instructions|prompt|rules)|tus instrucciones|reveal|show me your|muestra tu|repeat (the|your) (words|text|prompt)|"
    r"\bdrop\s+table\b|\bdelete\s+from\b|\bselect\b.{0,60}\bfrom\b|\binsert\s+into\b|\bupdate\b.{0,30}\bset\b|\bunion\s+select\b|--\s*$|;\s*--|"
    r"jailbreak|\bdan\b|developer mode|modo desarrollador|sudo|\bact as\b|override|bypass|"
    r"answer in (spanish|english|french|german|chinese)|responde en (espa[nñ]ol|ingl[eé]s|franc[eé]s)|respond (only )?in|say (that )?it is|di que es|"
    r"</?(system|assistant|user|instructions?)>|\[/?(inst|system)\]|###\s*(system|instruction)|\bBEGIN\b.{0,15}\bPROMPT\b|"
    r"\bexec(ute)?\b|\beval\b|\bos\.system\b|\bsubprocess\b|\brm\s+-rf\b|\bcurl\b|\bwget\b|https?://|file://|\.\./|/etc/passwd)", re.I)

LIVE_RE = re.compile(r"\b(today|right now|latest|live|real[- ]?time|currently|hoy|en vivo|ahora mismo)\b", re.I)
SAFETY_RE = re.compile(r"\b(safe|safer|safest|unsafe|seguro|segura|seguros|m[aá]s seguro|danger(ous)?|peligros[oa]|"
                       r"predict|prediction|forecast|predecir|predicci[oó]n|will happen|would happen|pasar[ií]a)\b", re.I)


def classify(question: str) -> str:
    """'injection' | 'off_topic' | 'in_scope'. Determinista; corre antes de cualquier modelo."""
    q = normalize(question)
    if not q:
        return "off_topic"
    if INJECTION_RE.search(q):
        return "injection"
    if DISALLOWED_RE.search(q) or not TOPIC_RE.search(q) and not _looks_like_test_id(q):
        return "off_topic"
    return "in_scope"


_ID_RE = re.compile(r"\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{6,}\b")


def _looks_like_test_id(q: str) -> bool:
    return bool(_ID_RE.search(q.upper()))
