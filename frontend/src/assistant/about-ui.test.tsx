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

// ---- labels and warnings (Part 1)
import { LEVELS } from './engine';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
const aboutBody = { answer: 'How to use it in 3 steps: …', citations: [], no_data: false, tool_calls: [{ tool: 'about', id: 'howto' }],
  meta: { level: 'high', model: null, mode: 'low', ms: 3, warnings: [], kind: 'about', section: 'Dashboard', suggestions: [] } };
const pick = async (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const send = (q: string) => { ask(q); };

describe('assistant labels and warnings', () => {
  it('about answer from Heavy: section shown, NO "verifiable citation" warning, neutral note, "Heavy · fixed answer"', async () => {
    const fetchImpl = (async () => json(aboutBody)) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl="http://x" fetchImpl={fetchImpl} />);
    await pick('Heavy'); send('how do I use it');
    const card = await screen.findByRole('article', { name: 'Answer' });
    expect(within(card).getByText('Section of this page')).toBeInTheDocument();
    expect(within(card).queryByText(/verifiable citation/)).toBeNull();
    expect(within(card).getByText('Heavy · fixed answer')).toBeInTheDocument();
    const note = within(card).getByText('Answered by a fixed rule (no model call).');
    expect(note.closest('.warn')).toBeNull();               // not the yellow warning style
  });

  it('about answer when the chosen level has no model (503) is answered by Basic: same answer, no citation warning', async () => {
    const fetchImpl = (async () => json({ detail: 'LLM unavailable' }, 503)) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl="http://x" fetchImpl={fetchImpl} />);
    await pick('Medium'); send('what is this page');
    const card = await screen.findByRole('article', { name: 'Answer' });
    expect(within(card).getByText('About this site')).toBeInTheDocument();
    expect(within(card).getByText('Section of this page')).toBeInTheDocument();
    expect(within(card).queryByText(/verifiable citation/)).toBeNull();
  });

  it('a data answer without a citation still gets the warning', async () => {
    const fetchImpl = (async () => json({ answer: 'Some data text.', citations: [], no_data: false, tool_calls: [], meta: { mode: 'ollama', model: 'qwen3:8b', warnings: [] } })) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl="http://x" fetchImpl={fetchImpl} />);
    await pick('Medium'); send('heptane burning rate');
    const card = await screen.findByRole('article', { name: 'Answer' });
    expect(within(card).getByText(/verifiable citation/)).toBeInTheDocument();
  });

  it('badge shows the model for model text, "fallback" for the template, "fixed answer" otherwise', async () => {
    const bodies = [
      { answer: 'Heptane burns faster.', mode: 'ollama', model: 'qwen3:14b' },
      { answer: 'FLEX burning rate: …', mode: 'fallback', model: 'qwen3:8b' },
    ];
    let i = 0;
    const fetchImpl = (async () => { const b = bodies[i++]; return json({ answer: b.answer, citations: [{ query: 'q4_burning_rate_by_o2', params: {}, source_doi: '10.60555/mbq8-0451', test_ids: [], test_ids_total: 0 }], no_data: false, tool_calls: [], meta: { mode: b.mode, model: b.model, warnings: [] } }); }) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl="http://x" fetchImpl={fetchImpl} />);
    await pick('Heavy'); send('heptane burning rate');
    expect(await screen.findByText('Heavy · qwen3:14b')).toBeInTheDocument();
    send('methanol burning rate');
    expect(await screen.findByText('Heavy · fallback')).toBeInTheDocument();
    expect(LEVELS.map((l) => l.label)).toEqual(['Basic', 'Flash', 'Medium', 'Heavy']);
  });

  it('a foreign-topic refusal is badged "Out of scope", not "No data"', async () => {
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} />);
    send('What is the capital of France?');
    const card = await screen.findByRole('article', { name: 'Answer' });
    expect(within(card).getByText('Out of scope')).toBeInTheDocument();
    expect(within(card).queryByText('No data')).toBeNull();
  });

  it('a data "no data" answer keeps the "No data" badge', async () => {
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} />);
    send('What happens to a fire in lunar gravity?');
    const card = await screen.findByRole('article', { name: 'Answer' });
    expect(within(card).getByText('No data')).toBeInTheDocument();
    expect(within(card).queryByText('Out of scope')).toBeNull();
  });
});
