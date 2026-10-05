import { Langfuse } from 'langfuse';
import * as Sentry from '@sentry/node';
import { currentContext } from '@/platform/requestContext.js';

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
const sentryDsn = process.env.SENTRY_DSN;

export const initSentry = (): void => {
  if (!sentryDsn) return;
  Sentry.init({ dsn: sentryDsn, environment: process.env.NODE_ENV });
};

export const reportError = (err: unknown, extra: Record<string, unknown> = {}): void => {
  if (!sentryDsn) return;
  Sentry.captureException(err, { extra: { requestId: currentContext()?.requestId, ...extra } });
};
