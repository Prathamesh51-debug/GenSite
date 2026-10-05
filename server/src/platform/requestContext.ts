import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export interface RequestContext {
    requestId: string;
    trace?: any;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const currentContext = (): RequestContext | undefined => storage.getStore();

export const runWithContext = <T>(context: RequestContext, fn: () => T): T => storage.run(context, fn);

const VALID_ID = /^[A-Za-z0-9_-]{8,64}$/;

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header('x-request-id');
    const requestId = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', requestId);
    storage.run({ requestId }, next);
};
