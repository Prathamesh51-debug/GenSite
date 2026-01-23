import express, { type Request, type Response } from 'express';
import 'dotenv/config'
import cors from 'cors'
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import userRouter from './routes/userRoutes.js';
import projectRouter from './routes/projectRoute.js';
import { stripeWebhook } from './controllers/stripeWebhook.js';

const app = express();

const port = 3000;

const corsOptions = {
    origin: process.env.TRUSTED_ORIGINS?.split(',') || [],
    credentials: true,
}

app.use(cors(corsOptions));

// DEBUG: Log every request for debugging purposes
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

app.post('/api/stripe', express.raw({type: 'application/json'}), stripeWebhook)

// DEBUG: Log when hitting the auth route
app.all('/api/auth/{*any}', (req, res, next) => {
    console.log('Auth route accessed:', req.method, req.url);
    return toNodeHandler(auth)(req, res);
});

app.use(express.json({limit: '50mb'}))

app.get('/', (req: Request, res: Response) => {
    console.log('Root endpoint hit');
    res.send('Server is Live!');
});

app.use('/api/user', (req, res, next) => {
    console.log('User route accessed:', req.method, req.originalUrl);
    next();
}, userRouter);

app.use('/api/project', (req, res, next) => {
    console.log('Project route accessed:', req.method, req.originalUrl);
    next();
}, projectRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});