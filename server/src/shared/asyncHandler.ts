import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Wrap an async controller so a thrown/rejected error reaches the error middleware
// instead of hanging the request — removes the try/catch boilerplate from handlers.
export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
    (req, res, next) => { fn(req, res, next).catch(next); };
