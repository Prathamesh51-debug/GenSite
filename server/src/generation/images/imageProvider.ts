// Image post-processing for generated sites (PRD R1).
//
// The LLM emits <img> tags whose src points at loremflickr (topic-matching but
// amateur/mediocre). After generation we rewrite those URLs to point at a better
// photo source. This is a plain HTTP call to a stock-photo *search* API — NOT an
// LLM/agent — and it is fully optional: with no key (or on any error) the original
// loremflickr URL is kept, so generation never breaks.
//
// Providers sit behind a small adapter so swapping Pexels → Unsplash → Pixabay is a
// one-file change; the generation pipeline only ever calls `enhanceImages(html)`.

type Orientation = 'landscape' | 'portrait' | 'square';

export interface ImageProvider {
  /** Return a photo URL for `keyword` near WxH, or null to keep the fallback. */
  find(keyword: string, orientation: Orientation, w: number, h: number, index: number): Promise<string | null>;
}

const orientationOf = (w: number, h: number): Orientation =>
  w > h * 1.1 ? 'landscape' : h > w * 1.1 ? 'portrait' : 'square';

// Matches https://loremflickr.com/W/H/KEYWORD(,KEYWORD...)?lock=N  (lock optional).
const LOREMFLICKR = /https?:\/\/loremflickr\.com\/(\d+)\/(\d+)\/([^"'\s?)]+)(?:\?lock=(\d+))?/gi;

// ── Pexels provider ─────────────────────────────────────────────────────────
// Search results are cached per keyword+orientation so a build (and repeat builds)
// makes at most one API call per distinct query; distinct on-page images stay
// distinct by indexing into the results array with the loremflickr `lock` value.
const searchCache = new Map<string, string[]>();
const MAX_CACHE = 200;

const pexels: ImageProvider = {
  async find(keyword, orientation, w, h, index) {
    const key = process.env.PEXELS_API_KEY;
    if (!key) return null;

    // loremflickr keyword is comma-joined single words ("coffee,cafe"); Pexels
    // wants a normal query string.
    const query = keyword.replace(/[,+]+/g, ' ').replace(/%20/g, ' ').trim();
    if (!query) return null;

    const cacheKey = `${orientation}|${query.toLowerCase()}`;
    let originals = searchCache.get(cacheKey);

    if (!originals) {
      const url =
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
        `&per_page=15&orientation=${orientation}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      try {
        const res = await fetch(url, { headers: { Authorization: key }, signal: ctrl.signal });
        if (!res.ok) return null;
        const data: any = await res.json();
        originals = (data?.photos ?? [])
          .map((p: any) => p?.src?.original)
          .filter((s: unknown): s is string => typeof s === 'string' && s.length > 0);
      } catch {
        return null; // network/timeout/abort → keep fallback
      } finally {
        clearTimeout(timer);
      }
      if (searchCache.size >= MAX_CACHE) searchCache.clear();
      searchCache.set(cacheKey, originals);
    }

    if (!originals.length) return null;

    // Pick a stable, distinct photo for this occurrence, then size-crop it to WxH
    // using Pexels' dynamic image params.
    const original = originals[Math.abs(index) % originals.length];
    return `${original}?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;
  },
};

// The active provider. Swap this line to change sources; the pipeline is unaffected.
const provider: ImageProvider = pexels;

/**
 * Rewrite loremflickr <img>/og:image URLs in `html` to curated photos from the
 * active provider. Env-gated and fail-safe: returns `html` unchanged when the
 * provider is unconfigured or every lookup misses.
 */
export const enhanceImages = async (html: string): Promise<string> => {
  if (!process.env.PEXELS_API_KEY || !html) return html;

  const matches = [...html.matchAll(LOREMFLICKR)];
  if (!matches.length) return html;

  // Resolve each distinct URL once (some URLs — e.g. og:image — repeat).
  const replacements = new Map<string, string>();
  await Promise.all(
    matches.map(async (m) => {
      const full = m[0];
      if (replacements.has(full)) return;
      const w = Number(m[1]);
      const h = Number(m[2]);
      const keyword = decodeURIComponent(m[3]);
      const lock = m[4] ? Number(m[4]) : 0;
      if (!w || !h) return;
      try {
        const url = await provider.find(keyword, orientationOf(w, h), w, h, lock);
        if (url) replacements.set(full, url);
      } catch {
        /* keep fallback */
      }
    })
  );

  if (!replacements.size) return html;
  return html.replace(LOREMFLICKR, (full) => replacements.get(full) ?? full);
};
