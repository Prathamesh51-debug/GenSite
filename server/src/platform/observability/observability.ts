// Optional observability. Everything here NO-OPS unless the relevant env keys are
// set AND the SDK is installed. Dynamic import with a variable specifier keeps the
// build/typecheck green without the dependency present — install `langfuse` /
// `@sentry/node` only when you want to turn these on.

// ---------- Langfuse: LLM tracing (cost / latency / model / fallbacks) ----------
let langfusePromise: Promise<any> | null = null;

const getLangfuse = (): Promise<any> | null => {
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) return null;
  if (!langfusePromise) {
    const pkg = 'langfuse' as string;
    langfusePromise = import(pkg)
      .then((L: any) => new L.Langfuse({
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        baseUrl: process.env.LANGFUSE_BASEURL,
      }))
      .catch(() => {
        console.warn('LANGFUSE keys set but the `langfuse` package is not installed.');
        return null;
      });
  }
  return langfusePromise;
};

export const traceGeneration = async (data: {
  model: string;
  latencyMs: number;
  usage?: unknown;
  success: boolean;
  requested?: string;
}): Promise<void> => {
  const p = getLangfuse();
  if (!p) return;
  try {
    const client = await p;
    if (!client) return;
    const trace = client.trace({ name: 'website-generation' });
    trace.generation({
      name: 'chat-completion',
      model: data.model,
      usage: data.usage,
      metadata: { latencyMs: data.latencyMs, success: data.success, requested: data.requested },
    });
    await client.flushAsync?.();
  } catch {
    /* never let telemetry break a request */
  }
};

// ---------- Sentry: server error monitoring ----------
export const initSentry = (): void => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const pkg = '@sentry/node' as string;
  import(pkg)
    .then((Sentry: any) => {
      Sentry.init({ dsn, tracesSampleRate: 0.1 });
      console.log('Sentry initialized (server).');
    })
    .catch(() => console.warn('SENTRY_DSN set but `@sentry/node` is not installed.'));
};
