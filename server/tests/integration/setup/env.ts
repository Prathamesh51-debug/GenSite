import { integrationDatabaseUrl } from './database.js';

const url = integrationDatabaseUrl();

process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
process.env.STRIPE_SECRET_KEY = 'sk_test_integration';
process.env.AI_API_KEY = 'integration';
process.env.PEXELS_API_KEY = '';
process.env.LANGFUSE_SECRET_KEY = '';
process.env.LANGFUSE_PUBLIC_KEY = '';
process.env.SENTRY_DSN = '';
process.env.FREE_DAILY_AI_CAP = '0';
