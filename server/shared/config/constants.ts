// Central knobs so numbers can't drift across handlers.

// Credit price per billable action.
export const CREDIT_COSTS = {
  generate: 5,
  revision: 5,
  elementEdit: 2,
} as const;

// Minimum balance required to start a new project (charged later, at generation).
export const MIN_CREDITS_TO_CREATE = 5;

// Payload / history bounds.
export const LIMITS = {
  promptMaxChars: 2000,
  messageMaxChars: 2000,
  pageMaxBytes: 1_000_000,
  jsonBodyMax: '2mb',
  versionHistory: 20,
} as const;

// Community gallery page size.
export const COMMUNITY_PAGE_SIZE = 12;
