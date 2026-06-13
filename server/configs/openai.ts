import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_API_KEY,
});

// Ordered list of free models to try. Free OpenRouter models get throttled
// (429 "rate-limited upstream") independently, so if the primary is busy we
// fall back to the next one. Reorder / edit here in one place.
export const FREE_MODELS = [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'qwen/qwen3-coder:free',
];

// Primary model (kept as a named export so call sites stay readable).
export const FREE_MODEL = FREE_MODELS[0];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelay = (attempt: number, hintSeconds?: number) => {
  const base =
    Number.isFinite(hintSeconds) && (hintSeconds as number) > 0
      ? (hintSeconds as number)
      : Math.min(2 ** attempt, 6);
  return base * 1000;
};

const is429 = (err: any) => (err?.status ?? err?.code) === 429;

/**
 * Chat completion with resilience for the free tier:
 *  - retries each model briefly on a transient 429
 *  - then falls back to the next free model in FREE_MODELS
 * Call sites pass `model: FREE_MODEL`; the requested model is tried first,
 * followed by the remaining fallbacks.
 */
export const createChatCompletion = async (
  params: any,
  { retriesPerModel = 1 }: { retriesPerModel?: number } = {}
): Promise<any> => {
  const requested: string | undefined = params?.model;
  const models = requested && !FREE_MODELS.includes(requested)
    ? [requested, ...FREE_MODELS]
    : [...FREE_MODELS];

  let lastError: any;

  for (const model of models) {
    for (let attempt = 0; attempt <= retriesPerModel; attempt++) {
      try {
        const res: any = await openai.chat.completions.create({ ...params, model });
        // Some providers relay the error inside a 200 response body.
        if (res?.error) {
          const code = res.error.code ?? res.error.status;
          lastError = new Error(res.error.message || 'AI provider error');
          if (code === 429) break; // give up on this model, try the next one
          throw lastError;
        }
        return res;
      } catch (error: any) {
        lastError = error;
        if (is429(error)) {
          if (attempt < retriesPerModel) {
            await sleep(retryDelay(attempt, Number(error?.headers?.['retry-after'])));
            continue; // retry same model
          }
          break; // exhausted retries -> next model
        }
        throw error; // non-rate-limit error: surface immediately
      }
    }
  }

  throw lastError ?? new Error('All free models are rate-limited. Please try again shortly.');
};

export default openai;
