import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [{ find: /^@\/(.*)$/, replacement: fileURLToPath(new URL('./src/$1', import.meta.url)) }],
    },
    test: {
        include: ['tests/integration/**/*.test.ts'],
        globalSetup: ['tests/integration/setup/migrate.ts'],
        setupFiles: ['tests/integration/setup/env.ts'],
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 60_000,
    },
});
