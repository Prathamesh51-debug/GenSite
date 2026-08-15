
export const CREDIT_COSTS = {
  generate: 5,
  revision: 5,
  elementEdit: 2,
} as const;

// Premium generation costs generate × this = 5 × 4 = 20 credits.
export const PREMIUM_MULTIPLIER = 4;

export const MIN_CREDITS_TO_CREATE = 5;

export const LIMITS = {
  promptMaxChars: 2000,
  messageMaxChars: 2000,
  pageMaxBytes: 1_000_000,
  jsonBodyMax: '2mb',
  versionHistory: 20,
} as const;

export const COMMUNITY_PAGE_SIZE = 12;
