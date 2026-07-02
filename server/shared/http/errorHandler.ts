import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError.js';

export const notFoundHandler = (_req: Request, res: Response) => {
    res.status(404).json({ message: 'Route not found' });
};

// One place that turns errors into responses: known AppErrors and validation errors
// map to clean messages; everything else is logged and returned as a generic 500.
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;

    if (err instanceof AppError) {
        return res.status(err.status).json({ message: err.message });
    }
    if (err instanceof ZodError) {
        return res.status(400).json({ message: err.issues[0]?.message ?? 'Invalid request' });
    }

    const e = err as any;
    console.error('Unhandled error:', e?.code || e?.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
};
