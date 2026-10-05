const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export const integrationDatabaseUrl = (): string => {
    const url = process.env.INTEGRATION_DATABASE_URL;
    if (!url) {
        throw new Error('Set INTEGRATION_DATABASE_URL to a throwaway local Postgres, e.g. postgresql://postgres:postgres@localhost:54329/gensite_test');
    }
    const host = new URL(url).hostname;
    if (!LOCAL_HOSTS.has(host)) {
        throw new Error(`Refusing to run integration tests against "${host}": only a local database is allowed.`);
    }
    return url;
};
