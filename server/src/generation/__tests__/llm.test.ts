import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.hoisted(() => vi.fn());
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));
vi.mock('@/platform/observability.js', () => ({ traceGeneration: () => Promise.resolve() }));

const ok = (model: string) => ({ model, choices: [{ message: { content: 'hi' }, finish_reason: 'stop' }], usage: { total_tokens: 10 } });
const rateLimited = () => Object.assign(new Error('rate limited'), { status: 429, headers: { 'retry-after': '0.01' } });

const load = async () => (await import('@/generation/llm.js')).createChatCompletion;

beforeEach(() => {
  vi.resetModules();
  create.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('createChatCompletion', () => {
  it('lets OpenRouter choose the provider', async () => {
    create.mockResolvedValue(ok('m'));
    await (await load())({ model: 'openai/gpt-oss-120b', messages: [] });
    expect(create.mock.calls[0][0].provider).toBeUndefined();
    expect(create.mock.calls[0][0].model).toBe('openai/gpt-oss-120b');
  });

  it('falls back to the next model when one fails', async () => {
    create.mockRejectedValueOnce(new Error('provider down')).mockResolvedValueOnce(ok('qwen/qwen3-coder'));
    const res = await (await load())({ model: 'openai/gpt-oss-120b', messages: [] });
    expect(res.model).toBe('qwen/qwen3-coder');
    expect(create.mock.calls.map((c) => c[0].model)).toEqual(['openai/gpt-oss-120b', 'qwen/qwen3-coder']);
  });

  it('retries the same model once after a rate limit', async () => {
    create.mockRejectedValueOnce(rateLimited()).mockResolvedValueOnce(ok('openai/gpt-oss-120b'));
    await (await load())({ model: 'openai/gpt-oss-120b', messages: [] });
    expect(create.mock.calls.map((c) => c[0].model)).toEqual(['openai/gpt-oss-120b', 'openai/gpt-oss-120b']);
  });

  it('stops immediately when the request is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    create.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect((await load())({ model: 'a', messages: [] }, { signal: controller.signal })).rejects.toThrow('aborted');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('asks for usage cost and logs the provider and cost of each call', async () => {
    create.mockResolvedValue({ ...ok('m'), provider: 'Cerebras', usage: { total_tokens: 10, cost: 0.0079 } });
    await (await load())({ model: 'openai/gpt-oss-120b', messages: [] });
    expect(create.mock.calls[0][0].usage).toEqual({ include: true });
    const lines = vi.mocked(console.log).mock.calls.map((c) => JSON.parse(String(c[0])));
    expect(lines.find((l) => l.event === 'llm')).toMatchObject({ level: 'info', outcome: 'ok', provider: 'Cerebras', costUsd: 0.0079 });
  });

  it('throws the last error when every model fails', async () => {
    create.mockRejectedValue(new Error('all down'));
    await expect((await load())({ model: 'a', messages: [] })).rejects.toThrow('all down');
  });
});

const streamOf = (pieces: string[], extra: Record<string, unknown> = {}, failAfter?: number) => ({
  async *[Symbol.asyncIterator]() {
    for (let i = 0; i < pieces.length; i++) {
      if (failAfter !== undefined && i === failAfter) throw new Error('connection reset');
      yield { model: 'openai/gpt-oss-120b', choices: [{ delta: { content: pieces[i] }, finish_reason: null }] };
    }
    yield { model: 'openai/gpt-oss-120b', provider: 'Parasail', choices: [{ delta: {}, finish_reason: 'stop' }], usage: { total_tokens: 42, cost: 0.004 }, ...extra };
  },
});

describe('streamChatCompletion', () => {
  const loadStream = async () => (await import('@/generation/llm.js')).streamChatCompletion;

  it('builds the text up chunk by chunk and returns a normal-looking response', async () => {
    create.mockResolvedValue(streamOf(['<html>', '<body>', 'Hi']));
    const seen: string[] = [];
    const res = await (await loadStream())({ model: 'openai/gpt-oss-120b', messages: [] }, { onText: (t) => seen.push(t) });

    expect(seen).toEqual(['<html>', '<html><body>', '<html><body>Hi']);
    expect(res.choices[0]).toEqual({ message: { content: '<html><body>Hi' }, finish_reason: 'stop' });
    expect(res).toMatchObject({ provider: 'Parasail', usage: { cost: 0.004 } });
    expect(typeof res.firstTokenMs).toBe('number');
    expect(create.mock.calls[0][0].stream).toBe(true);
  });

  it('falls back to the next model when a stream fails before any text arrives', async () => {
    create.mockResolvedValueOnce(streamOf(['x'], {}, 0)).mockResolvedValueOnce(streamOf(['ok']));
    const res = await (await loadStream())({ model: 'openai/gpt-oss-120b', messages: [] });
    expect(res.choices[0].message.content).toBe('ok');
    expect(create.mock.calls.map((c) => c[0].model)).toEqual(['openai/gpt-oss-120b', 'qwen/qwen3-coder']);
  });

  it('does not switch models half-way through a page', async () => {
    create.mockResolvedValue(streamOf(['<html>', '<body>', 'more'], {}, 2));
    await expect((await loadStream())({ model: 'openai/gpt-oss-120b', messages: [] })).rejects.toThrow('connection reset');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('reports a cut-off stream so the caller can retry', async () => {
    create.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: '<html><body>half' }, finish_reason: null }] };
        yield { choices: [{ delta: {}, finish_reason: 'length' }] };
      },
    });
    const res = await (await loadStream())({ model: 'm', messages: [] });
    expect(res.choices[0].finish_reason).toBe('length');
  });
});
