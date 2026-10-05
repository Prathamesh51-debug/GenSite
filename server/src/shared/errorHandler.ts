import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError.js';
import { log } from '@/platform/log.js';
import { reportError } from '@/platform/observability.js';
import { currentContext } from '@/platform/requestContext.js';

export const notFoundHandler = (_req: Request, res: Response) => {
    res.status(404).json({ message: 'Route not found' });
};

// One place that turns errors into responses: known AppErrors and validation errors
// map to clean messages; everything else is logged and returned as a generic 500.
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;

    if (err instanceof AppError) {
        return res.status(err.status).json({ message: err.message });
    }
    if (err instanceof ZodError) {
        return res.status(400).json({ message: err.issues[0]?.message ?? 'Invalid request' });
    }

    const e = err as any;
    log('unhandled_error', { method: req.method, path: req.path, code: e?.code, message: e?.message }, 'error');
    reportError(err, { method: req.method, path: req.path });
    res.status(500).json({ message: 'Something went wrong. Please try again.', requestId: currentContext()?.requestId });
};
