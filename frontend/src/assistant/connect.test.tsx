// Backend connection: /llm/status ("Connect local AI"), `model`, `meta` and test_ids_total (docs/API.md).
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { TEMPLATE_NOTICE, ask } from './engine';
import { data, renderWithData } from '../test/render';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
const STATUS = {
  available: true, ollama_url: 'http://localhost:11434',
  models: [
    { tag: 'llama3.2:3b', tier: 'flash', installed: true },
    { tag: 'qwen3:8b', tier: 'medium', installed: true },
    { tag: 'qwen3:14b', tier: 'heavy', installed: false },
  ],
};

describe('engine ↔ API contract', () => {
  it('Flash → level medium + its model; reads meta.warnings and test_ids_total', async () => {
    let sent: Record<string, unknown> = {};
    const fetchImpl = (async (_u: unknown, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return json({
        answer: '49 FLEX tests are near Earth / ISS reference air.', no_data: false, tool_calls: [],
        citations: [{ query: 'scenario', params: {}, source_doi: '10.60555/mbq8-0451',
          test_ids: data.scenarios.scenarios[0].exact.test_ids!.slice(0, 20), test_ids_total: 49 }],
        meta: { level: 'medium', model: 'llama3.2:3b', mode: 'ollama', ms: 900, warnings: ['n<5: unstable percentage; do not read it as a rate'] },
      });
    }) as unknown as typeof fetch;
    const r = await ask('ISS air', 'flash', data, { url: 'http://x', fetchImpl, model: 'llama3.2:3b' });
    expect(sent).toEqual({ question: 'ISS air', level: 'medium', model: 'llama3.2:3b' });
    expect(r.n).toBe(49);
    expect(r.aiText).toBe(true);
    expect(r.warnings[0]).toMatch(/^n<5/);
  });

  it('meta.mode fallback → not labelled as AI text, with a notice', async () => {
    const fetchImpl = (async () => json({ answer: 'FLEX burning rate: …', citations: [], no_data: false, tool_calls: [],
      meta: { level: 'medium', model: 'qwen3:8b', mode: 'fallback', ms: 5, warnings: [] } })) as unknown as typeof fetch;
    const r = await ask('q', 'medium', data, { url: 'http://x', fetchImpl });
    expect(r.aiText).toBe(false);
    expect(r.notice).toBe(TEMPLATE_NOTICE);
  });

  it('503 → Basic answer', async () => {
    const fetchImpl = (async () => json({ detail: 'LLM unavailable' }, 503)) as unknown as typeof fetch;
    const r = await ask('Is there data for a Moon base?', 'heavy', data, { url: 'http://x', fetchImpl });
    expect(r.answeredBy).toBe('basic');
    expect(r.n).toBe(17);
  });
});

describe('Connect local AI', () => {
  it('calls /llm/status (never Ollama), unlocks installed tiers and sends the model', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (u: unknown, init?: RequestInit) => {
      calls.push(String(u));
      if (String(u).endsWith('/llm/status')) return json(STATUS);
      return json({ answer: 'x', citations: [], no_data: true, tool_calls: [], meta: { mode: 'ollama', warnings: [] }, sent: init?.body });
    }) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} fetchImpl={fetchImpl} />);
    expect(screen.getByRole('button', { name: 'Flash' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Connect local AI' }));
    await waitFor(() => expect(screen.getByText(/Connected\. Models:/)).toBeInTheDocument());
    expect(calls).toEqual(['http://127.0.0.1:8000/llm/status']);
    expect(calls.some((c) => c.includes('11434'))).toBe(false);
    expect(screen.getByRole('button', { name: 'Flash' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Medium' })).toBeEnabled();
    const heavy = screen.getByRole('button', { name: 'Heavy' });
    expect(heavy).toBeDisabled();
    expect(heavy.getAttribute('title')).toBe('Model not installed: ollama pull qwen3:14b');
    expect(screen.getByText(/ollama pull qwen3:14b/)).toBeInTheDocument();
  });

  it('API not reachable → "not detected" with the commands; Basic still works', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} fetchImpl={fetchImpl} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect local AI' }));
    await waitFor(() => expect(screen.getByText(/Local AI not detected/)).toBeInTheDocument());
    expect(screen.getByText(/ollama pull llama3\.2:3b/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flash' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Basic' })).toBeEnabled();
  });

  it('API up but Ollama down → "Ollama was not detected"', async () => {
    const fetchImpl = (async () => json({ ...STATUS, available: false })) as unknown as typeof fetch;
    renderWithData(<Sidebar open onClose={() => {}} llmUrl={undefined} fetchImpl={fetchImpl} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect local AI' }));
    await waitFor(() => expect(screen.getByText(/Ollama was not detected/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Medium' })).toBeDisabled();
  });
});
