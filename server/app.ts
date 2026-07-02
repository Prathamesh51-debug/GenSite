import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './shared/lib/auth.js';
import prisma from './shared/lib/prisma.js';
import { parseTrustedOrigins } from './shared/lib/origins.js';
import { apiLimiter, authLimiter } from './shared/middleware/rateLimiters.js';
import { errorHandler, notFoundHandler } from './shared/http/errorHandler.js';
import { LIMITS } from './shared/config/constants.js';
import userRouter from './modules/user/user.routes.js';
import projectRouter from './modules/project/project.routes.js';
import { stripeWebhook } from './modules/billing/billing.controller.js';

// Assemble the Express app (kept separate from bootstrap so it can be imported and tested).
export const createApp = () => {
    const app = express();
    const isProd = process.env.NODE_ENV === 'production';
    const trustedOrigins = parseTrustedOrigins();

    // Baseline security headers for a JSON API (CSP/CORP off — no HTML served here).
    app.disable('x-powered-by');
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginEmbedderPolicy: false,
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'no-referrer' },
    }));

    // Render terminates TLS at a proxy; trust it so the rate limiter keys on real client IP.
    app.set('trust proxy', 1);

    app.use(cors({ origin: trustedOrigins, credentials: true }));

    // CSRF defense-in-depth: block cross-origin mutations. Same-origin and
    // server-to-server (Stripe) requests carry no/trusted Origin and pass through.
    app.use((req, res, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
        const origin = req.headers.origin;
        if (origin && !trustedOrigins.includes(origin)) {
            return res.status(403).json({ message: 'Cross-origin request blocked' });
        }
        next();
    });

    if (!isProd) {
        app.use((req, _res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
            next();
        });
    }

    // Stripe webhook needs the raw body for signature verification — mount before json().
    app.post('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

    app.all('/api/auth/{*any}', authLimiter, (req, res) => toNodeHandler(auth)(req, res));

    app.use(express.json({ limit: LIMITS.jsonBodyMax }));

    app.get('/', (_req: Request, res: Response) => res.send('Server is Live!'));

    // Health probe — reports DB reachability too (503 if the SELECT 1 fails).
    app.get('/healthz', async (_req: Request, res: Response) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            res.json({ status: 'ok', db: 'up' });
        } catch {
            res.status(503).json({ status: 'degraded', db: 'down' });
        }
    });

    app.use('/api/user', apiLimiter, userRouter);
    app.use('/api/project', apiLimiter, projectRouter);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};
