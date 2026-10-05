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

interface ActionMeta {
  userId?: string;
  projectId?: string;
  tier?: string | null;
}

export const startAction = (name: string, meta: ActionMeta): void => {
  const context = currentContext();
  if (!langfuse || !context) return;
  try {
    context.trace = langfuse.trace({
      name,
      userId: meta.userId,
      sessionId: meta.projectId,
      tags: [meta.tier ?? 'free'],
      metadata: { requestId: context.requestId, projectId: meta.projectId },
    });
  } catch {
    /* never let telemetry break a request */
  }
};

export const endAction = (outcome: string, details: Record<string, unknown> = {}): void => {
  const context = currentContext();
  if (!context?.trace) return;
  try {
    context.trace.update({ output: { outcome, ...details } });
  } catch {
    /* never let telemetry break a request */
  }
  context.trace = undefined;
};

export const traceGeneration = (data: {
  model: string;
  latencyMs: number;
  usage?: any;
  costUsd?: number | null;
  provider?: string | null;
  success: boolean;
  requested?: string;
}): void => {
  if (!langfuse) return;
  try {
    const parent = currentContext()?.trace ?? langfuse.trace({ name: 'llm-call' });
    const endTime = new Date();
    parent.generation({
      name: 'chat-completion',
      model: data.model,
      startTime: new Date(endTime.getTime() - data.latencyMs),
      endTime,
      usage: {
        input: data.usage?.prompt_tokens,
        output: data.usage?.completion_tokens,
        total: data.usage?.total_tokens,
        totalCost: data.costUsd ?? undefined,
      },
      metadata: { requested: data.requested, provider: data.provider, fallback: !!data.requested && data.requested !== data.model },
      level: data.success ? 'DEFAULT' : 'ERROR',
    });
  } catch {
    /* never let telemetry break a request */
  }
};

export const flushTraces = async (timeoutMs = 3000): Promise<void> => {
  if (!langfuse) return;
  await Promise.race([
    langfuse.shutdownAsync().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, timeoutMs).unref()),
  ]);
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
