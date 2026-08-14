// Curated model catalog shown to the user (served via GET /api/user/models) with
// plain-English guidance on what each is good at. "auto" = the multi-model round-robin
// (spreads load + resilient). Free models work out of the box; paid ones need
// OpenRouter credits. The server validates any chosen id against this list.

export interface ModelOption {
  id: string;                 // 'auto' or an OpenRouter model id
  label: string;
  description: string;
  tier: 'auto' | 'free' | 'paid';
  bestFor: string[];          // tags for the "recommended for" hints
  recommended?: boolean;
}

export const MODELS: ModelOption[] = [
  {
    id: 'auto',
    label: 'Auto — Smart mix',
    description: 'Spreads pages across several free models in parallel for speed and resilience. Best default.',
    tier: 'auto',
    bestFor: ['Balanced', 'Fastest overall', 'Multi-page'],
    recommended: true,
  },
  {
    id: 'openai/gpt-oss-120b:free',
    label: 'GPT-OSS 120B (free)',
    description: 'Strongest free model for visual design, layout and copy. Great for landing pages.',
    tier: 'free',
    bestFor: ['Design', 'Layout', 'Landing pages'],
  },
  {
    id: 'qwen/qwen3-coder:free',
    label: 'Qwen3 Coder (free)',
    description: 'Best free model at precise code and interactivity — JS, forms, sliders, components.',
    tier: 'free',
    bestFor: ['Interactivity', 'Clean code', 'Edits'],
  },
  {
    id: 'openai/gpt-oss-20b:free',
    label: 'GPT-OSS 20B (free)',
    description: 'Lighter and fastest. Good for quick drafts and simple sites.',
    tier: 'free',
    bestFor: ['Speed', 'Simple sites'],
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet (premium)',
    description: 'Top-tier quality and consistency — the best-looking sites. Requires OpenRouter credits.',
    tier: 'paid',
    bestFor: ['Premium quality', 'Design', 'Code'],
  },
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o (premium)',
    description: 'Excellent all-round quality. Requires OpenRouter credits.',
    tier: 'paid',
    bestFor: ['Premium quality', 'Balanced'],
  },
];

export const isValidModel = (id?: string | null): boolean =>
  !!id && MODELS.some((m) => m.id === id);

/** Returns a concrete model id to use, or null to use the Auto multi-model mix. */
export const resolveModel = (id?: string | null): string | null =>
  id && id !== 'auto' && isValidModel(id) ? id : null;
