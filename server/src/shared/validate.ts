import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

// Validate + coerce request parts against Zod schemas before the controller runs, so
// handlers receive already-clean, typed input and never re-check `req.body` by hand.
export const validate =
    (schemas: { body?: ZodType; params?: ZodType }) =>
    (req: Request, _res: Response, next: NextFunction) => {
        try {
            if (schemas.body) req.body = schemas.body.parse(req.body);
            if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
            next();
        } catch (err) {
            next(err);
        }
    };
