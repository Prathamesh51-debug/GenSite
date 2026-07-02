// Single source of truth for parsing TRUSTED_ORIGINS. Splitting on ',' alone is a
// footgun: a natural "https://a.com, https://b.com" (note the space) yields a
// " https://b.com" entry that never matches a browser Origin header — silently
// breaking CORS AND the CSRF origin check for that origin, with no error to explain
// why. Trim every entry and drop empties.
export const parseTrustedOrigins = (raw: string | undefined = process.env.TRUSTED_ORIGINS): string[] =>
  (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
