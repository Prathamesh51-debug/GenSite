import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

const reportError = vi.hoisted(() => vi.fn());
vi.mock('@/platform/observability.js', () => ({ reportError }));

import { errorHandler } from '@/shared/errorHandler.js';
import { NotFoundError } from '@/shared/AppError.js';
import { requestContext } from '@/platform/requestContext.js';

const fakeResponse = () => {
  const res: any = { headersSent: false, headers: {} as Record<string, string> };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  return res;
};

const handle = (err: unknown) => {
  const res = fakeResponse();
  const req: any = { method: 'POST', path: '/api/project/revision/p1', header: () => 'req-12345678' };
  requestContext(req, res, () => errorHandler(err, req, res, () => {}));
  return res;
};

beforeEach(() => {
  reportError.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('errorHandler', () => {
  it('returns expected errors as-is and does not report them', () => {
    const res = handle(new NotFoundError('Project not found'));
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'Project not found' });
    expect(reportError).not.toHaveBeenCalled();
  });

  it('turns validation errors into a 400 without reporting them', () => {
    const parsed = z.object({ message: z.string() }).safeParse({});
    const res = handle(parsed.error);
    expect(res.statusCode).toBe(400);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('reports unexpected errors and returns a generic message with the request id', () => {
    const boom = new Error('database exploded');
    const res = handle(boom);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'Something went wrong. Please try again.', requestId: 'req-12345678' });
    expect(reportError).toHaveBeenCalledWith(boom, { method: 'POST', path: '/api/project/revision/p1' });
    expect(JSON.stringify(res.body)).not.toContain('database exploded');
  });
});
