import { Langfuse } from 'langfuse';

// Observability. Each integration no-ops unless its env keys are set, so local dev
// and unconfigured environments run without them.

// ---------- Langfuse: LLM tracing (cost / latency / model / fallbacks) ----------
const langfuse =
  process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY
    ? new Langfuse({
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        baseUrl: process.env.LANGFUSE_BASEURL,
      })
    : null;

export const traceGeneration = async (data: {
  model: string;
  latencyMs: number;
  usage?: unknown;
  success: boolean;
  requested?: string;
}): Promise<void> => {
  if (!langfuse) return;
  try {
    const trace = langfuse.trace({ name: 'website-generation' });
    trace.generation({
      name: 'chat-completion',
      model: data.model,
      usage: data.usage as any,
      metadata: { latencyMs: data.latencyMs, success: data.success, requested: data.requested },
    });
    await langfuse.flushAsync();
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
