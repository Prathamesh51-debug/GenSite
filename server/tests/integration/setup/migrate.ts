import { execSync } from 'node:child_process';
import { integrationDatabaseUrl } from './database.js';

export default function migrate() {
    const url = integrationDatabaseUrl();
    execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    });
}
