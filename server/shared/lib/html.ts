// Helpers for turning a raw LLM response into a clean, renderable HTML document.

/**
 * Extracts clean HTML from a model response that may include markdown code
 * fences, leading prose, or stray reasoning text.
 */
export const extractHtml = (raw?: string | null): string => {
    let s = (raw || '').trim();
    if (!s) return '';

    // Strip markdown code fences (``` or ```html / ```HTML), anywhere in the text.
    s = s.replace(/```+[a-z]*\n?/gi, '').replace(/```+/g, '').trim();

    // If a full-document marker exists, start from there so any preamble the
    // model added ("Here is your updated site:") is discarded.
    const start = s.search(/<!doctype html|<html[\s>]/i);
    if (start > 0) s = s.slice(start);

    return s.trim();
};

/** Cheap sanity check that the string is actually an HTML document, not junk. */
export const looksLikeHtml = (s: string): boolean =>
    !!s && s.length > 30 && /<[a-z!]/i.test(s);
