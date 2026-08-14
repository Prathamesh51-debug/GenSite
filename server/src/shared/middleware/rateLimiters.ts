import rateLimit from 'express-rate-limit';

const bucket = (max: number) =>
    rateLimit({ windowMs: 60_000, max, standardHeaders: true, legacyHeaders: false });

// General API traffic — generous so thumbnails/scroll don't 429.
export const apiLimiter = bucket(200);
// Auth endpoints — tighter, to slow credential stuffing.
export const authLimiter = bucket(20);
// Expensive LLM / credit-charging endpoints.
export const genLimiter = bucket(20);
// DB-writing endpoints that don't hit the LLM (saves, rollbacks, publish, delete).
export const writeLimiter = bucket(60);
