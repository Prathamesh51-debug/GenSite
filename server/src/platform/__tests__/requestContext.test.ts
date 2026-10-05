import { describe, it, expect, vi, afterEach } from 'vitest';
import { requestContext, currentContext } from '@/platform/requestContext.js';
import { log } from '@/platform/log.js';

const fakeRequest = (headers: Record<string, string> = {}) =>
  ({ header: (name: string) => headers[name.toLowerCase()] }) as any;

const fakeResponse = () => {
  const headers: Record<string, string> = {};
  return { headers, setHeader: (name: string, value: string) => { headers[name] = value; } } as any;
};

afterEach(() => vi.restoreAllMocks());

describe('requestContext', () => {
  it('gives every request an id, echoes it in a header and exposes it to later code', async () => {
    const res = fakeResponse();
    let seen: string | undefined;
    await new Promise<void>((done) => requestContext(fakeRequest(), res, () => {
      setTimeout(() => { seen = currentContext()?.requestId; done(); }, 0);
    }));
    expect(seen).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['X-Request-Id']).toBe(seen);
  });

  it('reuses a well-formed incoming request id', () => {
    const res = fakeResponse();
    requestContext(fakeRequest({ 'x-request-id': 'trace-abc12345' }), res, () => {
      expect(currentContext()?.requestId).toBe('trace-abc12345');
    });
  });

  it('ignores a malformed incoming request id', () => {
    const res = fakeResponse();
    requestContext(fakeRequest({ 'x-request-id': 'bad id; drop table' }), res, () => {
      expect(currentContext()?.requestId).not.toBe('bad id; drop table');
    });
  });

  it('keeps concurrent requests apart', async () => {
    const ids = await Promise.all([1, 2, 3].map(() => new Promise<string | undefined>((done) =>
      requestContext(fakeRequest(), fakeResponse(), () => setTimeout(() => done(currentContext()?.requestId), Math.random() * 5)))));
    expect(new Set(ids).size).toBe(3);
  });

  it('has no context outside a request', () => {
    expect(currentContext()).toBeUndefined();
  });
});

describe('log', () => {
  it('writes one JSON line with the event and the current request id', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    requestContext(fakeRequest({ 'x-request-id': 'req-12345678' }), fakeResponse(), () => {
      log('edit', { projectId: 'p1', textChanged: 0.1 });
    });
    expect(JSON.parse(spy.mock.calls[0][0])).toEqual({ level: 'info', event: 'edit', requestId: 'req-12345678', projectId: 'p1', textChanged: 0.1 });
  });

  it('sends errors to stderr', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    log('generation_failed', { message: 'boom' }, 'error');
    expect(JSON.parse(spy.mock.calls[0][0])).toMatchObject({ level: 'error', event: 'generation_failed', message: 'boom' });
  });
});
