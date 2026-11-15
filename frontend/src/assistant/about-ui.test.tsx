// Assistant UI: "About this site" answers and clickable suggestions on refusals.
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { renderWithData } from '../test/render';

const ask = (q: string) => {
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: q } });
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
};

describe('assistant: questions about the page', () => {
  it('answers "Hows the page function, I don\'t know any about it" with the About badge, a section and no "No data"', async () => {
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} />);
    ask("Hows the page function, I don't know any about it");
    const card = await screen.findByRole('article', { name: 'Answer' });
    expect(within(card).getByText('About this site')).toBeInTheDocument();
    expect(within(card).queryByText('No data')).toBeNull();
    expect(within(card).getByText(/How to use it in 3 steps/)).toBeInTheDocument();
    expect(within(card).getByText('Section of this page')).toBeInTheDocument();
    expect(within(card).queryByText(/doi:/)).toBeNull();
  });

  it('a refusal shows 4 clickable suggestions; clicking "What is this page?" answers it', async () => {
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} />);
    ask('What is the capital of France?');
    const card = await screen.findByRole('article', { name: 'Answer' });
    expect(within(card).getByText('I can only answer questions about the NASA PSI combustion data shown on this site.')).toBeInTheDocument();
    const btn = within(card).getByRole('button', { name: 'What is this page?' });
    expect(within(card).getAllByRole('button').filter((b) => b.closest('.suggest')).length).toBe(4);
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getAllByText('About this site').length).toBe(1));
  });

  it('a greeting answers with suggestions', async () => {
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} />);
    ask('hello');
    const card = await screen.findByRole('article', { name: 'Answer' });
    expect(within(card).getByText(/^Hello!/)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'How do I use it?' })).toBeInTheDocument();
  });
});
