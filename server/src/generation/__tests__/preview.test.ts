import { describe, it, expect } from 'vitest';
import { previewSnapshot } from '@/generation/preview.js';

const head = '<!DOCTYPE html><html><head><title>Crumb</title><script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script><link href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" rel="stylesheet"></head>';

describe('previewSnapshot', () => {
  it('shows nothing until the body has started', () => {
    expect(previewSnapshot('Sure! Here is your site')).toBeNull();
    expect(previewSnapshot(head)).toBeNull();
  });

  it('keeps the Tailwind script so the half-built page is styled', () => {
    const snap = previewSnapshot(`${head}<body><section id="hero"><h1>Fresh bread</h1>`)!;
    expect(snap).toContain('@tailwindcss/browser@4');
    expect(snap).toContain('<h1>Fresh bread</h1>');
  });

  it('never runs the page\'s own half-written scripts', () => {
    const snap = previewSnapshot(`${head}<body><h1>Hi</h1><script>document.body.innerHTML = '';</script><script>const menu = docu`)!;
    expect(snap).not.toContain('innerHTML');
    expect(snap).not.toContain('const menu');
  });

  it('makes scroll animations visible, since their init script comes last', () => {
    const snap = previewSnapshot(`${head}<body><section data-aos="fade-up"><h2>Menu</h2></section>`)!;
    expect(snap).toMatch(/<head[^>]*><style>\[data-aos\]\{opacity:1!important/);
  });

  it('drops a tag that was cut off mid-way', () => {
    const snap = previewSnapshot(`${head}<body><h1>Hi</h1><div class="bg-amber`)!;
    expect(snap).not.toContain('bg-amber');
    expect(snap).toContain('<h1>Hi</h1>');
  });

  it('closes a style block that was cut off, so the follow script is not swallowed', () => {
    const snap = previewSnapshot(`${head}<body><h1>Hi</h1><style>.hero { color: red`)!;
    expect(snap.indexOf('</style>')).toBeLessThan(snap.lastIndexOf('<script>addEventListener'));
  });

  it('swaps placeholder image URLs for photos that load', () => {
    const snap = previewSnapshot(`${head}<body><img src="https://loremflickr.com/600/400/bread?lock=2">`)!;
    expect(snap).not.toContain('loremflickr.com');
    expect(snap).toContain('https://picsum.photos/seed/bread-2/600/400');
  });

  it('ignores markdown fences and chatter before the document', () => {
    const snap = previewSnapshot('Here you go:\n```html\n' + `${head}<body><h1>Hi</h1>`)!;
    expect(snap.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('neutralises javascript: links in the partial page', () => {
    const snap = previewSnapshot(`${head}<body><a href="javascript:alert(1)">x</a>`)!;
    expect(snap).not.toContain('javascript:');
  });
});
