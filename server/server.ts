import 'dotenv/config';
import { initSentry } from './shared/lib/observability.js';
import { createApp } from './app.js';

// No-op unless SENTRY_DSN is set + @sentry/node installed.
initSentry();

const port = Number(process.env.PORT) || 3000;

createApp().listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
