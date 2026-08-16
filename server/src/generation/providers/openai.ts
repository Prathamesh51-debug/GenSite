import OpenAI from 'openai';
import { traceGeneration } from '@/platform/observability/observability.js';

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

export const createChatCompletion = async (
  params: any,
  { retriesPerModel = 1, signal }: { retriesPerModel?: number; signal?: AbortSignal } = {}
): Promise<any> => {
  const requested: string | undefined = params?.model;
  const models = requested
    ? [requested, ...FREE_MODELS.filter((m) => m !== requested)]
    : [...FREE_MODELS];

  let lastError: any;

  const started = Date.now();
  const logLlm = (fields: Record<string, unknown>) =>
    console.log(`[llm] ${JSON.stringify({ requested, ms: Date.now() - started, ...fields })}`);

  for (const model of models) {
    for (let attempt = 0; attempt <= retriesPerModel; attempt++) {
      try {
        const res: any = await openai.chat.completions.create({ ...params, model }, signal ? { signal } : undefined);

        if (res?.error) {
          const code = res.error.code ?? res.error.status;
          lastError = new Error(res.error.message || 'AI provider error');

          logLlm({ model, event: code === 429 ? 'rate_limited' : 'provider_error', code });
          break;
        }
        logLlm({ model, event: 'ok', fallback: model !== requested, tokens: res?.usage?.total_tokens ?? null });
        traceGeneration({ model, latencyMs: Date.now() - started, usage: res?.usage, success: true, requested }).catch(() => {});
        return res;
      } catch (error: any) {
        lastError = error;

        if (signal?.aborted || error?.name === 'AbortError') throw error;

        if (is429(error) && attempt < retriesPerModel) {
          logLlm({ model, event: 'rate_limited', attempt });
          await sleep(retryDelay(attempt, Number(error?.headers?.['retry-after'])));
          continue;
        }

        logLlm({ model, event: is429(error) ? 'rate_limited' : 'error', message: error?.message });
        break;
      }
    }
  }

  throw lastError ?? new Error('All free models are rate-limited. Please try again shortly.');
};

export default openai;
