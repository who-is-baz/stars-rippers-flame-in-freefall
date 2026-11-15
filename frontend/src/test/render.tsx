// Test helper: renders a component with the REAL data files from public/data, so tests check real numbers.
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { DataContext, type DataBundle } from '../data/DataProvider';
import meta from '../../public/data/meta.json';
import scenarios from '../../public/data/scenarios.json';
import coverage from '../../public/data/coverage.json';
import experiments from '../../public/data/experiments.json';
import gaps from '../../public/data/gaps.json';
import materials from '../../public/data/materials.json';
import answers from '../../public/data/answers.json';

export const data = { meta, scenarios, coverage, experiments, gaps, materials, answers } as unknown as DataBundle;

export const renderWithData = (ui: ReactElement) =>
  render(<DataContext.Provider value={{ status: 'ready', data }}>{ui}</DataContext.Provider>);
