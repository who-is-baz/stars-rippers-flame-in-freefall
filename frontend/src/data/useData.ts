import { useContext } from 'react';
import { DataContext, type DataBundle, type DataState } from './DataProvider';

export const useDataState = (): DataState => useContext(DataContext);

// Las vistas se montan solo cuando status === 'ready' (lo garantiza <DataGate>), así que aquí sí hay datos.
export function useData(): DataBundle {
  const s = useContext(DataContext);
  if (s.status !== 'ready') throw new Error('useData called before data is ready');
  return s.data;
}
export const useMeta = () => useData().meta;
export const useScenarios = () => useData().scenarios;
export const useCoverage = () => useData().coverage;
export const useExperiments = () => useData().experiments;
export const useGaps = () => useData().gaps;
export const useMaterials = () => useData().materials;
export const useAnswers = () => useData().answers;
