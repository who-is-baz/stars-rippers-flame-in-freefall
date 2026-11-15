// Part C (mentor): oxygen, pressure and airflow instruments under the camera.
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Console } from './Console';
import { AIRFLOW_NOTE } from './SceneInstruments';
import { renderWithBoard } from '../test/render';

const panel = () => screen.getByRole('region', { name: /Scene instruments/ });
const pick = (re: RegExp) => fireEvent.click(within(screen.getByRole('group', { name: 'Choose an atmosphere' })).getByRole('button', { name: re }));

describe('scene instruments', () => {
  beforeEach(() => window.localStorage.clear());

  it('the camera legend now reads "Conceptual illustration. Not a physical simulation or a prediction."', () => {
    renderWithBoard(<Console preset={null} />);
    expect(screen.getByText('Conceptual illustration. Not a physical simulation or a prediction.')).toBeInTheDocument();
    expect(screen.queryByText('Illustration. Not a combustion simulation.')).toBeNull();
  });

  it('oxygen and pressure follow the scenario, with the Earth reference', () => {
    renderWithBoard(<Console preset={null} />);
    pick(/Moon base/);
    expect(within(panel()).getByRole('group', { name: /^Oxygen: ≥30% O₂/ })).toBeInTheDocument();
    expect(within(panel()).getByRole('group', { name: /^Pressure: ≤10.2 psi \(0.69 atm\)/ })).toBeInTheDocument();
    expect(panel().textContent).toMatch(/Earth air 21%/);
    expect(panel().textContent).toMatch(/Earth 14\.7 psi/);
    pick(/Earth \/ ISS/);
    expect(within(panel()).getByRole('group', { name: /^Oxygen: 21% O₂/ })).toBeInTheDocument();
    expect(within(panel()).getByRole('group', { name: /^Pressure: 14\.7 psi \(1\.00 atm\)/ })).toBeInTheDocument();
  });

  it('airflow: a measured BASS-II range (AI-extracted, with n) only where the matching tests have one', () => {
    renderWithBoard(<Console preset={null} />);
    pick(/Earth \/ ISS/);
    const flow = within(panel()).getByRole('group', { name: /^Airflow \d/ });
    expect(flow.textContent).toMatch(/cm\/s/);
    expect(flow.textContent).toMatch(/BASS-II, n = \d+ of \d+ tests at this O₂ · AI-extracted/);
    expect(panel().textContent).not.toContain(AIRFLOW_NOTE);
  });

  it('airflow is "conceptual" with the required sentence and NO number when no matching test has it (Moon base, Spacesuit)', () => {
    renderWithBoard(<Console preset={null} />);
    for (const re of [/Moon base/, /Spacesuit/, /Exploration/]) {
      pick(re);
      const flow = within(panel()).getByRole('group', { name: /^Airflow \(conceptual\)/ });
      expect(flow.textContent).toContain('Airflow (conceptual)');
      expect(flow.textContent).toContain('Not a measured variable in the matching tests');
      expect(flow.textContent).not.toMatch(/\d+\s*cm\/s/);
    }
  });

  it('Custom controls drive the instruments', () => {
    renderWithBoard(<Console preset={null} />);
    fireEvent.click(screen.getByRole('button', { name: /^Custom Observed tests/ }));
    fireEvent.change(screen.getByLabelText('Oxygen (O₂)'), { target: { value: '0.27' } });
    expect(within(panel()).getByRole('group', { name: /^Oxygen: 27% O₂/ })).toBeInTheDocument();
  });

  it('no forecasting or safety words in the instruments', () => {
    renderWithBoard(<Console preset={null} />);
    expect(panel().textContent).not.toMatch(/\b(safe|safer|unsafe|predict\w*|probabilit\w*|risk|will|would|likely|chance)\b/i);
  });
});
