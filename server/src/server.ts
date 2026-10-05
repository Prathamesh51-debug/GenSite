import 'dotenv/config';
import { initSentry, flushTraces } from '@/platform/observability.js';
import { createApp } from '@/app.js';
import { startChargeSweeper } from '@/core/credits.js';

// No-op unless SENTRY_DSN is set + @sentry/node installed.
initSentry();

const port = Number(process.env.PORT) || 3000;

const server = createApp().listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    startChargeSweeper();
});

const shutdown = () => {
    server.close();
    flushTraces().finally(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
