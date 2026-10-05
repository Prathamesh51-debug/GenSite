import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const llm = vi.hoisted(() => ({ createChatCompletion: vi.fn(), streamChatCompletion: vi.fn() }));
vi.mock('@/generation/llm.js', () => ({ ...llm, FREE_MODEL: 'free-model', ENHANCE_MODEL: 'cheap-model', EDIT_MODEL: 'free-model' }));
vi.mock('@/generation/images.js', async (orig) => ({ ...(await orig<any>()), enhanceImages: async (html: string) => html }));

import { generateSite, PREVIEW_INTERVAL_MS } from '@/generation/generate.js';

const page = '<!DOCTYPE html><html><head><title>Crumb</title></head><body><section id="hero"><h1>Fresh bread</h1></section></body></html>';
const done = (content: string, finish = 'stop', model = 'free-model') => ({ model, choices: [{ message: { content }, finish_reason: finish }] });
const longPrompt = 'a modern website for a neighbourhood bakery with a menu our story opening hours and a contact form';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-05T10:00:00Z'));
  llm.createChatCompletion.mockReset();
  llm.streamChatCompletion.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('generateSite streaming', () => {
  it('streams a free-tier build as throttled, displayable snapshots', async () => {
    llm.streamChatCompletion.mockImplementation(async (_params: any, { onText }: any) => {
      const steps = ['<!DOCTYPE html><html><head>', '<!DOCTYPE html><html><head></head><body><h1>Fre', page];
      for (const [i, text] of steps.entries()) {
        vi.setSystemTime(new Date(Date.UTC(2026, 9, 5, 10, 0, 0) + i * (PREVIEW_INTERVAL_MS + 1)));
        onText(text);
      }
      return done(page);
    });
    const chunks: string[] = [];

    const result = await generateSite(longPrompt, { model: 'free', onChunk: (html) => chunks.push(html) });

    expect(result?.html).toContain('<h1>Fresh bread</h1>');
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain('<h1>Fre');
    expect(chunks[1]).toContain('<h1>Fresh bread</h1>');
    expect(llm.createChatCompletion).not.toHaveBeenCalled();
  });

  it('sends at most one snapshot per interval', async () => {
    llm.streamChatCompletion.mockImplementation(async (_params: any, { onText }: any) => {
      for (let i = 0; i < 20; i++) onText(`<!DOCTYPE html><html><head></head><body><p>${'x'.repeat(i)}</p>`);
      return done(page);
    });
    const chunks: string[] = [];
    await generateSite(longPrompt, { model: 'free', onChunk: (html) => chunks.push(html) });
    expect(chunks).toHaveLength(1);
  });

  it('does not stream premium builds yet', async () => {
    llm.createChatCompletion.mockResolvedValue(done(page, 'stop', 'premium-model'));
    const chunks: string[] = [];
    await generateSite(longPrompt, { model: 'premium', onChunk: (html) => chunks.push(html) });
    expect(llm.streamChatCompletion).not.toHaveBeenCalled();
    expect(chunks).toHaveLength(0);
  });

  it('retries once when the streamed page is cut off', async () => {
    llm.streamChatCompletion
      .mockResolvedValueOnce(done('<!DOCTYPE html><html><body><h1>Half', 'length'))
      .mockResolvedValueOnce(done(page));
    const result = await generateSite(longPrompt, { model: 'free', onChunk: () => {} });
    expect(llm.streamChatCompletion).toHaveBeenCalledTimes(2);
    expect(result?.html).toContain('</html>');
  });

  it('passes a cancel straight through instead of treating it as a failed build', async () => {
    const controller = new AbortController();
    controller.abort();
    llm.streamChatCompletion.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(generateSite(longPrompt, { model: 'free', onChunk: () => {}, signal: controller.signal })).rejects.toThrow('aborted');
  });
});
