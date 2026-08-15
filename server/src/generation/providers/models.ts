
import { CREDIT_COSTS, PREMIUM_MULTIPLIER } from '@/shared/config/constants.js';

export type Tier = 'free' | 'premium';

export interface TierOption {
  id: Tier;
  label: string;
  description: string;
  credits: number;
  recommended?: boolean;
}

export const TIERS: TierOption[] = [
  {
    id: 'free',
    label: 'Free',
    description: 'Fast, free models — great for most sites.',
    credits: CREDIT_COSTS.generate,
    recommended: true,
  },
  {
    id: 'premium',
    label: 'Premium',
    description: 'Higher-accuracy models for the most polished, consistent results.',
    credits: CREDIT_COSTS.generate * PREMIUM_MULTIPLIER,
  },
];

// Premium tier. For now this points at the strongest FREE coder so both tiers
// cost $0 while the project is being finished. When ready, flip to a paid model
// by setting PREMIUM_MODEL in the env (e.g. openai/gpt-5-mini) — no code change.
const PREMIUM_MODEL = process.env.PREMIUM_MODEL || 'openai/gpt-oss-120b:free';

export const isValidTier = (id?: string | null): id is Tier =>
  id === 'free' || id === 'premium';

export const generationCost = (tier?: string | null): number =>
  tier === 'premium' ? CREDIT_COSTS.generate * PREMIUM_MULTIPLIER : CREDIT_COSTS.generate;

export const resolveModel = (tier?: string | null): string | null =>
  tier === 'premium' ? PREMIUM_MODEL : null;
