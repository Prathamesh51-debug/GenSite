import OpenAI from 'openai';
import { traceGeneration } from './observability.js';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_API_KEY,
  // Our own fallback loop handles retries; don't let the SDK double them.
  timeout: 150000,
  maxRetries: 0,
});

// Free models, tried in order — each is throttled independently, so a busy primary
// falls back to the next. Override via GEN_MODELS once you add OpenRouter credits.
export const FREE_MODELS = process.env.GEN_MODELS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'qwen/qwen3-coder:free',
];

// Primary model for fresh generation (good at design/layout).
export const FREE_MODEL = process.env.GEN_MODEL || FREE_MODELS[0];

// Edit tasks — a coder model follows precise "change X to Y" instructions better.
export const EDIT_MODEL = process.env.EDIT_MODEL || 'qwen/qwen3-coder:free';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelay = (attempt: number, hintSeconds?: number) => {
  const base =
    Number.isFinite(hintSeconds) && (hintSeconds as number) > 0
      ? (hintSeconds as number)
      : Math.min(2 ** attempt, 6);
  return base * 1000;
};

const is429 = (err: any) => (err?.status ?? err?.code) === 429;

// Chat completion with free-tier resilience: retry a model briefly on 429, then fall
// back to the next model in FREE_MODELS. The requested model is always tried first.
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
        // Some providers relay the error inside a 200 body.
        if (res?.error) {
          const code = res.error.code ?? res.error.status;
          lastError = new Error(res.error.message || 'AI provider error');
          if (code === 429) { logLlm({ model, event: 'rate_limited' }); break; }
          throw lastError;
        }
        logLlm({ model, event: 'ok', fallback: model !== requested, tokens: res?.usage?.total_tokens ?? null });
        traceGeneration({ model, latencyMs: Date.now() - started, usage: res?.usage, success: true, requested }).catch(() => {});
        return res;
      } catch (error: any) {
        lastError = error;
        if (is429(error)) {
          logLlm({ model, event: 'rate_limited', attempt });
          if (attempt < retriesPerModel) {
            await sleep(retryDelay(attempt, Number(error?.headers?.['retry-after'])));
            continue;
          }
          break; // exhausted -> next model
        }
        logLlm({ model, event: 'error', message: error?.message });
        throw error; // non-429: surface immediately
      }
    }
  }

  throw lastError ?? new Error('All free models are rate-limited. Please try again shortly.');
};

export default openai;
