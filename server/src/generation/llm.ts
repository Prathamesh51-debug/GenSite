import OpenAI from 'openai';
import { traceGeneration } from '@/platform/observability.js';
import { log } from '@/platform/log.js';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_API_KEY,

  timeout: 150000,
  maxRetries: 0,
});

export const FREE_MODELS = process.env.GEN_MODELS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [
  'openai/gpt-oss-120b',
  'qwen/qwen3-coder',
];

export const FREE_MODEL = process.env.GEN_MODEL || FREE_MODELS[0];

export const EDIT_MODEL = process.env.EDIT_MODEL || 'openai/gpt-oss-120b';

export const ENHANCE_MODEL = process.env.ENHANCE_MODEL || 'qwen/qwen3-coder';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelay = (attempt: number, hintSeconds?: number) => {
  const base =
    Number.isFinite(hintSeconds) && (hintSeconds as number) > 0
      ? (hintSeconds as number)
      : Math.min(2 ** attempt, 6);
  return base * 1000;
};

const is429 = (err: any) => (err?.status ?? err?.code) === 429;

interface CompletionOptions {
  retriesPerModel?: number;
  signal?: AbortSignal;
}

const runWithFallbacks = async (
  params: any,
  { retriesPerModel = 1, signal }: CompletionOptions,
  call: (model: string) => Promise<any>
): Promise<any> => {
  const requested: string | undefined = params?.model;
  const models = requested
    ? [requested, ...FREE_MODELS.filter((m) => m !== requested)]
    : [...FREE_MODELS];

  let lastError: any;

  const started = Date.now();
  const logLlm = (fields: Record<string, unknown>) => log('llm', { requested, ms: Date.now() - started, ...fields });

  for (const model of models) {
    for (let attempt = 0; attempt <= retriesPerModel; attempt++) {
      try {
        const res: any = await call(model);

        if (res?.error) {
          const code = res.error.code ?? res.error.status;
          lastError = new Error(res.error.message || 'AI provider error');

          logLlm({ model, outcome: code === 429 ? 'rate_limited' : 'provider_error', code });
          break;
        }
        logLlm({
          model,
          outcome: 'ok',
          fallback: model !== requested,
          provider: res?.provider ?? null,
          tokens: res?.usage?.total_tokens ?? null,
          costUsd: res?.usage?.cost ?? null,
          ...(res?.firstTokenMs !== undefined ? { firstTokenMs: res.firstTokenMs } : {}),
        });
        traceGeneration({
          model,
          latencyMs: Date.now() - started,
          usage: res?.usage,
          costUsd: res?.usage?.cost ?? null,
          provider: res?.provider ?? null,
          success: true,
          requested,
        });
        return res;
      } catch (error: any) {
        lastError = error;

        if (signal?.aborted || error?.name === 'AbortError') throw error;

        if (error?.partial) {
          logLlm({ model, outcome: 'stream_broken', message: error?.message });
          throw error;
        }

        if (is429(error) && attempt < retriesPerModel) {
          logLlm({ model, outcome: 'rate_limited', attempt });
          await sleep(retryDelay(attempt, Number(error?.headers?.['retry-after'])));
          continue;
        }

        logLlm({ model, outcome: is429(error) ? 'rate_limited' : 'error', message: error?.message });
        break;
      }
    }
  }

  throw lastError ?? new Error('All free models are rate-limited. Please try again shortly.');
};

export const createChatCompletion = (params: any, options: CompletionOptions = {}): Promise<any> =>
  runWithFallbacks(params, options, (model) =>
    openai.chat.completions.create(
      { ...params, usage: { include: true }, model } as any,
      options.signal ? { signal: options.signal } : undefined
    ));

const readStream = async (
  params: any,
  model: string,
  signal: AbortSignal | undefined,
  onText: ((text: string) => void) | undefined
): Promise<any> => {
  const started = Date.now();
  const stream: any = await openai.chat.completions.create(
    { ...params, usage: { include: true }, model, stream: true } as any,
    signal ? { signal } : undefined
  );

  let text = '';
  let finish: string | null = null;
  let usage: any = null;
  let served = model;
  let provider: string | null = null;
  let firstTokenMs: number | null = null;

  try {
    for await (const chunk of stream) {
      if (chunk?.error) throw new Error(chunk.error.message || 'AI provider error');
      const choice = chunk?.choices?.[0];
      const delta: string | undefined = choice?.delta?.content;
      if (delta) {
        if (firstTokenMs === null) firstTokenMs = Date.now() - started;
        text += delta;
        onText?.(text);
      }
      if (choice?.finish_reason) finish = choice.finish_reason;
      if (chunk?.usage) usage = chunk.usage;
      if (chunk?.model) served = chunk.model;
      if (chunk?.provider) provider = chunk.provider;
    }
  } catch (err: any) {
    throw text ? Object.assign(err instanceof Error ? err : new Error(String(err)), { partial: true }) : err;
  }

  return { model: served, provider, usage, firstTokenMs, choices: [{ message: { content: text }, finish_reason: finish }] };
};

export const streamChatCompletion = (
  params: any,
  options: CompletionOptions & { onText?: (text: string) => void } = {}
): Promise<any> =>
  runWithFallbacks(params, options, (model) => readStream(params, model, options.signal, options.onText));

export default openai;
