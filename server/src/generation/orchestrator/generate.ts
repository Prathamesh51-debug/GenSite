import { createChatCompletion, FREE_MODEL, ENHANCE_MODEL } from '@/generation/providers/openai.js';
import { resolveModel } from '@/generation/providers/models.js';
import { extractHtml, looksLikeHtml, tagSectionsIfMissing } from '@/core/html.js';
import { buildSinglePageMessages, buildEnhanceMessages } from '@/generation/prompts/prompts.js';
import { enhanceImages } from '@/generation/images/imageProvider.js';

const isVague = (prompt: string): boolean => prompt.trim().split(/\s+/).length < 12;

const enhancePrompt = async (prompt: string, signal?: AbortSignal): Promise<string> => {
  if (!isVague(prompt)) return prompt;
  try {
    const res: any = await createChatCompletion(
      { model: ENHANCE_MODEL, max_tokens: 1800, messages: buildEnhanceMessages(prompt) },
      { signal }
    );
    const brief = res?.choices?.[0]?.message?.content?.trim();
    return brief && brief.length > prompt.length ? `${prompt}\n\nDESIGN BRIEF:\n${brief}` : prompt;
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError') throw err;
    return prompt;
  }
};

export interface GenerationResult {
  files: Record<string, string>; // path -> html
  index: string;                 // files['index.html']
  downgraded?: boolean;
}

const generateSinglePage = async (
  model: string,
  prompt: string,
  signal?: AbortSignal
): Promise<{ html: string; usedModel: string } | null> => {
  let best = '';
  let bestModel = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const res: any = await createChatCompletion(
      { model, max_tokens: 16000, messages: buildSinglePageMessages(prompt) },
      { signal }
    ).catch(() => null);
    const html = extractHtml(res?.choices?.[0]?.message?.content) || '';
    const usedModel = res?.model || '';
    const truncated = res?.choices?.[0]?.finish_reason === 'length';
    if (looksLikeHtml(html) && !truncated && /<\/html>/i.test(html)) return { html, usedModel };
    if (html.length > best.length) { best = html; bestModel = usedModel; }
  }
  return looksLikeHtml(best) ? { html: best, usedModel: bestModel } : null;
};

export const generateSite = async (
  prompt: string,
  opts: { signal?: AbortSignal; onProgress?: (msg: string) => void; model?: string | null } = {}
): Promise<GenerationResult | null> => {
  const { signal, onProgress } = opts;
  const isPremium = opts.model === 'premium';
  const chosen = resolveModel(opts.model);
  const model = chosen || FREE_MODEL;

  onProgress?.('Designing your site…');
  const effective = await enhancePrompt(prompt, signal);

  onProgress?.(
    isPremium
      ? 'Crafting your premium site — our best model takes a little longer for the extra polish. Hang tight…'
      : 'Building your site…'
  );

  const single = await generateSinglePage(model, effective, signal);
  if (!single) return null;

  // Upgrade placeholder photos to curated stock (PRD R1). Optional + fail-safe:
  // with no PEXELS_API_KEY, or on any error, the original loremflickr URLs remain.
  onProgress?.('Polishing images…');
  let html = await enhanceImages(single.html).catch(() => single.html);
  html = tagSectionsIfMissing(html);

  const downgraded = isPremium && !!chosen && !!single.usedModel && !single.usedModel.startsWith(chosen);
  return { files: { 'index.html': html }, index: html, downgraded };
};
