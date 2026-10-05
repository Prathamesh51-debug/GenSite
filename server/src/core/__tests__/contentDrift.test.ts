import { describe, it, expect } from 'vitest';
import { measureContentDrift } from '../contentDrift.js';

const site = (title: string, cls: string, body: string) =>
  `<!DOCTYPE html><html><head><title>${title}</title><script>const menu = 1;</script></head><body>
<section id="hero" class="${cls}"><h1>${body}</h1><p>Open every day from seven</p></section>
<section id="menu" class="${cls}"><h2>Our menu</h2><p>Sourdough loaves and croissants</p></section>
</body></html>`;

const bakery = site('Sweet Crumbs Bakery', 'bg-white p-8', 'Fresh bread baked every morning');

describe('measureContentDrift', () => {
  it('scores an unchanged page as zero drift', () => {
    expect(measureContentDrift(bakery, bakery)).toEqual({ textChanged: 0, linesChanged: 0, titleChanged: false });
  });

  it('a restyle changes markup but barely touches the text', () => {
    const restyled = site('Sweet Crumbs Bakery', 'bg-gradient-to-r from-amber-50 to-white p-12', 'Fresh bread baked every morning');
    const drift = measureContentDrift(bakery, restyled);
    expect(drift.linesChanged).toBeGreaterThan(0);
    expect(drift.textChanged).toBe(0);
    expect(drift.titleChanged).toBe(false);
  });

  it('turning the bakery into a gym replaces most of the text and the title', () => {
    const gym = `<!DOCTYPE html><html><head><title>Iron Pulse Gym</title></head><body>
<section id="hero"><h1>Train harder with certified coaches</h1><p>Strength classes and cardio programmes</p></section>
</body></html>`;
    const drift = measureContentDrift(bakery, gym);
    expect(drift.textChanged).toBeGreaterThan(0.8);
    expect(drift.titleChanged).toBe(true);
  });

  it('ignores script contents and HTML entities when comparing text', () => {
    const withScript = bakery.replace('const menu = 1;', 'const menu = 2; trackVisitors();').replace('Our menu', 'Our&nbsp;menu');
    expect(measureContentDrift(bakery, withScript).textChanged).toBe(0);
  });
});
