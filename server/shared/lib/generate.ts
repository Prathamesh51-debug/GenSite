// Two-step, multi-model, multi-page generation.
//   Step 1: derive a design brief (industry-dedicated identity) as JSON.
//   Step 2: build each page in PARALLEL, round-robining across the free models to
//           spread load, all sharing the brief's design system + a consistent nav.
// Falls back to single-page generation if the brief step fails, so it never hard-fails.

import { createChatCompletion, FREE_MODEL, FREE_MODELS } from './openai.js';
import { resolveModel } from './models.js';
import { extractHtml, looksLikeHtml } from './html.js';
import {
  buildBriefMessages,
  buildLayoutMessages,
  buildContentMessages,
  buildPageMessages,
  buildSinglePageMessages,
  type DesignBrief,
  type BriefPage,
} from './prompts.js';

const escapeTitle = (t: string): string => String(t ?? '').replace(/[<>&$]/g, '').slice(0, 80);

export interface GenerationResult {
  files: Record<string, string>; // path -> html
  index: string;                 // files['index.html']
}

// Normalize a model-proposed page path to a safe, flat `*.html` filename. Strips
// anything that isn't [a-z0-9._-], removes leading dots and any `..` sequence (so a
// hostile/garbled path can't become a traversal-looking ZIP entry or JSON key), and
// guarantees an `.html` extension so pages don't silently collapse together.
const sanitizePath = (p: unknown): string => {
  let s = String(p ?? '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  s = s.replace(/^\.+/, '').replace(/\.\.+/g, '.');
  if (!s || s === '.html') return 'index.html';
  if (!s.endsWith('.html')) s += '.html';
  return s;
};

const parseBrief = (raw?: string | null): DesignBrief | null => {
  if (!raw) return null;
  let s = raw.trim().replace(/```+[a-z]*\n?/gi, '').replace(/```+/g, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const brief = JSON.parse(s.slice(start, end + 1)) as DesignBrief;
    if (!brief || !Array.isArray(brief.pages) || brief.pages.length === 0) return null;

    // Normalize pages: cap at 5, sanitize filenames, ensure an index.html exists.
    let pages: BriefPage[] = brief.pages.slice(0, 5).map((p: any) => ({
      path: sanitizePath(p?.path),
      title: String(p?.title || 'Page'),
      purpose: p?.purpose ? String(p.purpose) : undefined,
      sections: Array.isArray(p?.sections) ? p.sections.map(String) : undefined,
    }));
    if (!pages.some((p) => p.path === 'index.html')) pages[0] = { ...pages[0], path: 'index.html' };
    // De-dupe paths.
    const seen = new Set<string>();
    pages = pages.filter((p) => (seen.has(p.path) ? false : (seen.add(p.path), true)));

    brief.pages = pages;
    return brief;
  } catch {
    return null;
  }
};

export const generateSite = async (
  prompt: string,
  opts: { signal?: AbortSignal; onProgress?: (msg: string) => void; model?: string | null } = {}
): Promise<GenerationResult | null> => {
  const { signal, onProgress } = opts;
  // A specific chosen model (or null → the Auto multi-model mix).
  const chosen = resolveModel(opts.model);
  const briefModel = chosen || FREE_MODEL;

  // --- Step 1: design brief ---
  onProgress?.('Designing your site…');
  const briefRes = await createChatCompletion(
    { model: briefModel, max_tokens: 1500, messages: buildBriefMessages(prompt) },
    { signal }
  ).catch(() => null);
  const brief = parseBrief(briefRes?.choices?.[0]?.message?.content);

  // --- Fallback: single page (old behaviour) ---
  if (!brief) {
    onProgress?.('Building your site…');
    const res = await createChatCompletion(
      { model: briefModel, max_tokens: 12000, messages: buildSinglePageMessages(prompt) },
      { signal }
    );
    const html = extractHtml(res?.choices?.[0]?.message?.content);
    if (!looksLikeHtml(html)) return null;
    return { files: { 'index.html': html }, index: html };
  }

  const models = chosen ? [chosen] : (FREE_MODELS.length ? FREE_MODELS : [FREE_MODEL]);
  const pageLabel = `${brief.pages.length} page${brief.pages.length > 1 ? 's' : ''}`;

  // --- Step 2a: the SHARED layout (identical logo/header/nav/footer on every page) ---
  onProgress?.('Designing the shared layout…');
  const layoutRes = await createChatCompletion(
    { model: chosen || FREE_MODEL, max_tokens: 6000, messages: buildLayoutMessages(brief, brief.pages, prompt) },
    { signal }
  ).catch(() => null);
  const layout = extractHtml(layoutRes?.choices?.[0]?.message?.content);
  const canUseLayout = looksLikeHtml(layout) && layout.includes('<!--PAGE_CONTENT-->');

  if (canUseLayout) {
    // --- Step 2b: only each page's UNIQUE content, injected into the shared layout.
    // The chrome is byte-for-byte identical because it comes from one `layout` string. ---
    onProgress?.(`Building ${pageLabel}…`);
    const contentResults = await Promise.all(
      brief.pages.map((page, i) =>
        createChatCompletion(
          { model: models[i % models.length], max_tokens: 8000, messages: buildContentMessages(brief, page, prompt) },
          { signal }
        )
          .then((r: any) => ({ page, content: extractHtml(r?.choices?.[0]?.message?.content) }))
          .catch(() => ({ page, content: '' }))
      )
    );

    const files: Record<string, string> = {};
    for (const { page, content } of contentResults) {
      if (!content || content.trim().length < 20) continue;
      // Function replacers so `$` in the HTML isn't treated as a replacement pattern.
      let doc = layout.replace('<!--PAGE_CONTENT-->', () => content);
      doc = doc.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeTitle(page.title)}</title>`);
      doc = doc.replace(`href="${page.path}"`, () => `href="${page.path}" aria-current="page"`);
      files[page.path] = doc;
    }
    const idx = files['index.html'] || Object.values(files)[0];
    if (idx && looksLikeHtml(idx)) {
      if (!files['index.html']) files['index.html'] = idx;
      return { files, index: idx };
    }
    // else fall through to the per-page fallback below
  }

  // --- Fallback: per-page full documents (chrome may vary slightly across models). ---
  onProgress?.(`Building ${pageLabel}…`);
  const results = await Promise.all(
    brief.pages.map((page, i) =>
      createChatCompletion(
        { model: models[i % models.length], max_tokens: 12000, messages: buildPageMessages(brief, page, brief.pages, prompt) },
        { signal }
      )
        .then((r: any) => ({ page, html: extractHtml(r?.choices?.[0]?.message?.content) }))
        .catch(() => ({ page, html: '' }))
    )
  );

  const files: Record<string, string> = {};
  for (const { page, html } of results) {
    if (looksLikeHtml(html)) files[page.path] = html;
  }

  const index = files['index.html'] || Object.values(files)[0];
  if (!index || !looksLikeHtml(index)) return null;
  if (!files['index.html']) files['index.html'] = index;
  return { files, index };
};
