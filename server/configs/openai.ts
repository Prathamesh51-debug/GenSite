import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_API_KEY,
  // Abort a hung request instead of waiting forever, and let our own
  // model-fallback loop (below) handle retries rather than the SDK doubling them.
  timeout: 150000,
  maxRetries: 0,
});

// Ordered list of free models to try. Free OpenRouter models get throttled
// (429 "rate-limited upstream") independently, so if the primary is busy we
// fall back to the next one. Reorder / edit here in one place.
// Free defaults. Override ANY of these via .env once you add OpenRouter credits
// (no code change — just restart). e.g.:
//   GEN_MODEL=anthropic/claude-3.5-sonnet
//   EDIT_MODEL=anthropic/claude-3.5-sonnet
export const FREE_MODELS = process.env.GEN_MODELS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'qwen/qwen3-coder:free',
];

// Primary model for fresh generation (good at design/layout).
export const FREE_MODEL = process.env.GEN_MODEL || FREE_MODELS[0];

// Model for EDIT tasks (revisions, single-element edits). A coder model follows
// precise "change X to Y" instructions far better than the general model.
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
  // Always try the requested model FIRST, then fall back to the rest. This lets
  // call sites route different tasks to different models (e.g. a coder model for
  // edits) instead of always starting from FREE_MODELS[0].
  const models = requested
    ? [requested, ...FREE_MODELS.filter((m) => m !== requested)]
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
