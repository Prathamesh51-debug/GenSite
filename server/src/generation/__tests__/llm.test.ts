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
    const line = vi.mocked(console.log).mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[llm]'));
    expect(JSON.parse(line!.slice(6))).toMatchObject({ event: 'ok', provider: 'Cerebras', costUsd: 0.0079 });
  });

  it('throws the last error when every model fails', async () => {
    create.mockRejectedValue(new Error('all down'));
    await expect((await load())({ model: 'a', messages: [] })).rejects.toThrow('all down');
  });
});
