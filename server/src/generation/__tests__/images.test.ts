import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const page = `<html><head><meta property="og:image" content="https://loremflickr.com/1200/630/bakery?lock=9"></head><body>
<img src="https://loremflickr.com/600/400/bread,sourdough?lock=2" alt="Bread">
<img src="https://loremflickr.com/400/400/croissant?lock=3" alt="Croissant">
<img src="https://i.pravatar.cc/150?img=5" alt="Customer">
</body></html>`;

const load = async () => (await import('@/generation/images.js')).enhanceImages;

const pexelsReturns = (photos: string[]) =>
  vi.fn(async () => ({ ok: true, json: async () => ({ photos: photos.map((original) => ({ src: { original } })) }) }));

beforeEach(() => {
  vi.resetModules();
  delete process.env.PEXELS_API_KEY;
});

afterEach(() => vi.unstubAllGlobals());

describe('enhanceImages', () => {
  it('never leaves a loremflickr URL behind, even without a Pexels key', async () => {
    const html = await (await load())(page);
    expect(html).not.toContain('loremflickr.com');
    expect(html).toContain('https://picsum.photos/seed/bread-2/600/400');
    expect(html).toContain('https://picsum.photos/seed/croissant-3/400/400');
    expect(html).toContain('content="https://picsum.photos/seed/bakery-9/1200/630"');
    expect(html).toContain('https://i.pravatar.cc/150?img=5');
  });

  it('uses a matching Pexels photo, cropped to the requested size, when one is found', async () => {
    process.env.PEXELS_API_KEY = 'test';
    vi.stubGlobal('fetch', pexelsReturns(['https://images.pexels.com/photos/1/a.jpeg']));
    const html = await (await load())(page);
    expect(html).toContain('https://images.pexels.com/photos/1/a.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=600&h=400');
    expect(html).not.toContain('loremflickr.com');
  });

  it('falls back to a stable photo when Pexels finds nothing or fails', async () => {
    process.env.PEXELS_API_KEY = 'test';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    const html = await (await load())(page);
    expect(html).toContain('https://picsum.photos/seed/bread-2/600/400');
    expect(html).not.toContain('loremflickr.com');
  });

  it('gives the same image on every run, so pages do not change on reload', async () => {
    const enhance = await load();
    expect(await enhance(page)).toBe(await enhance(page));
  });

  it('copes with a malformed keyword instead of failing the whole page', async () => {
    const html = await (await load())('<img src="https://loremflickr.com/300/200/caf%E9?lock=1">');
    expect(html).toContain('https://picsum.photos/seed/');
    expect(html).not.toContain('loremflickr.com');
  });
});
