import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Scenario } from '../data/types';

// --- Escenario activo (default: Moon base del reto) ---
type ScenarioId = Scenario['id'];
const ScenarioCtx = createContext<{ scenarioId: ScenarioId; setScenarioId: (id: ScenarioId) => void } | null>(null);
export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('lunar_challenge');
  const v = useMemo(() => ({ scenarioId, setScenarioId }), [scenarioId]);
  return <ScenarioCtx.Provider value={v}>{children}</ScenarioCtx.Provider>;
}

// --- Modo de explicación ---
export type ExplainMode = 'explorer' | 'engineer';
const ModeCtx = createContext<{ mode: ExplainMode; setMode: (m: ExplainMode) => void } | null>(null);
export function ExplainModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ExplainMode>('explorer');
  const v = useMemo(() => ({ mode, setMode }), [mode]);
  return <ModeCtx.Provider value={v}>{children}</ModeCtx.Provider>;
}

// --- Panel SI (sin UI todavía; el estado ya existe para el paquete del panel) ---
export type AssistantLevel = 'low' | 'medium' | 'high';
export type AssistantStatus = 'idle' | 'thinking' | 'error';
export const ASSISTANT_MIN_WIDTH = 360;
export const ASSISTANT_MAX_WIDTH = 560;
interface AssistantValue {
  open: boolean; setOpen: (o: boolean) => void;
  width: number; setWidth: (w: number) => void;
  level: AssistantLevel; setLevel: (l: AssistantLevel) => void;
  status: AssistantStatus; setStatus: (s: AssistantStatus) => void;
}
const AssistantCtx = createContext<AssistantValue | null>(null);
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [width, setW] = useState(ASSISTANT_MIN_WIDTH);
  const [level, setLevel] = useState<AssistantLevel>('low'); // el navegador no abre Ollama: Low es lo normal
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const setWidth = (w: number) => setW(Math.min(ASSISTANT_MAX_WIDTH, Math.max(ASSISTANT_MIN_WIDTH, w)));
  const v = useMemo(() => ({ open, setOpen, width, setWidth, level, setLevel, status, setStatus }), [open, width, level, status]);
  return <AssistantCtx.Provider value={v}>{children}</AssistantCtx.Provider>;
}

function need<T>(c: T | null, name: string): T {
  if (!c) throw new Error(`${name} used outside its provider`);
  return c;
}
export const useScenario = () => need(useContext(ScenarioCtx), 'useScenario');
export const useExplainMode = () => need(useContext(ModeCtx), 'useExplainMode');
export const useAssistant = () => need(useContext(AssistantCtx), 'useAssistant');
