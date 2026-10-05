import { describe, it, expect, vi, beforeEach } from 'vitest';

const lf = vi.hoisted(() => {
  const generation = vi.fn();
  const update = vi.fn();
  const trace = vi.fn(() => ({ generation, update }));
  return { generation, update, trace, shutdownAsync: vi.fn(async () => {}) };
});
vi.mock('langfuse', () => ({ Langfuse: class { trace = lf.trace; shutdownAsync = lf.shutdownAsync; } }));

const load = async () => ({
  ...(await import('@/platform/observability.js')),
  runWithContext: (await import('@/platform/requestContext.js')).runWithContext,
});

beforeEach(() => {
  vi.resetModules();
  lf.trace.mockClear();
  lf.generation.mockClear();
  lf.update.mockClear();
  process.env.LANGFUSE_SECRET_KEY = 'sk';
  process.env.LANGFUSE_PUBLIC_KEY = 'pk';
});

describe('Langfuse tracing', () => {
  it('records every AI call of one action under a single trace', async () => {
    const obs = await load();
    await obs.runWithContext({ requestId: 'req-1' }, async () => {
      obs.startAction('revision', { userId: 'u1', projectId: 'p1', tier: 'premium' });
      obs.traceGeneration({ model: 'm1', latencyMs: 1200, usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }, costUsd: 0.002, success: true, requested: 'm1' });
      obs.traceGeneration({ model: 'm2', latencyMs: 800, success: true, requested: 'm1' });
      obs.endAction('saved', { changes: 4 });
    });

    expect(lf.trace).toHaveBeenCalledTimes(1);
    expect(lf.trace).toHaveBeenCalledWith(expect.objectContaining({
      name: 'revision', userId: 'u1', sessionId: 'p1', tags: ['premium'],
      metadata: { requestId: 'req-1', projectId: 'p1' },
    }));
    expect(lf.generation).toHaveBeenCalledTimes(2);
    expect(lf.generation.mock.calls[0][0]).toMatchObject({
      model: 'm1', usage: { input: 100, output: 50, total: 150, totalCost: 0.002 }, metadata: { fallback: false },
    });
    expect(lf.generation.mock.calls[1][0]).toMatchObject({ model: 'm2', metadata: { fallback: true } });
    expect(lf.update).toHaveBeenCalledWith({ output: { outcome: 'saved', changes: 4 } });
  });

  it('gives an AI call outside any action its own trace', async () => {
    const obs = await load();
    obs.traceGeneration({ model: 'm', latencyMs: 10, success: true });
    expect(lf.trace).toHaveBeenCalledWith({ name: 'llm-call' });
    expect(lf.generation).toHaveBeenCalledTimes(1);
  });

  it('does nothing without keys', async () => {
    delete process.env.LANGFUSE_SECRET_KEY;
    const obs = await load();
    await obs.runWithContext({ requestId: 'req-2' }, async () => {
      obs.startAction('generate', { userId: 'u1' });
      obs.traceGeneration({ model: 'm', latencyMs: 10, success: true });
      obs.endAction('done');
    });
    expect(lf.trace).not.toHaveBeenCalled();
  });

  it('never lets a tracing failure break the request', async () => {
    const obs = await load();
    lf.trace.mockImplementationOnce(() => { throw new Error('langfuse down'); });
    await obs.runWithContext({ requestId: 'req-3' }, async () => {
      expect(() => obs.startAction('generate', { userId: 'u1' })).not.toThrow();
      expect(() => obs.endAction('done')).not.toThrow();
    });
  });

  it('caps the shutdown flush so an unreachable Langfuse cannot hold up a deploy', async () => {
    const obs = await load();
    lf.shutdownAsync.mockImplementationOnce(() => new Promise(() => {}));
    const started = Date.now();
    await obs.flushTraces(50);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
