import { describe, it, expect } from 'vitest'
import { extractHtml, looksLikeHtml, extractSections, replaceSectionById, tagSectionsIfMissing } from '../html'

describe('extractHtml', () => {
  it('returns empty string for null/empty input', () => {
    expect(extractHtml(null)).toBe('')
    expect(extractHtml('')).toBe('')
    expect(extractHtml('   ')).toBe('')
  })

  it('strips markdown code fences', () => {
    const out = extractHtml('```html\n<!DOCTYPE html><html><head></head><body></body></html>\n```')
    expect(out.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(out).not.toContain('```')
  })

  it('discards preamble before the document', () => {
    const out = extractHtml('Here is your site:\n<!doctype html><html><body>hi</body></html>')
    expect(out.toLowerCase().startsWith('<!doctype html>')).toBe(true)
  })

  it('keeps a clean document valid', () => {
    const doc = '<!DOCTYPE html><html><body>ok</body></html>'
    expect(looksLikeHtml(extractHtml(doc))).toBe(true)
  })

  it('strips reasoning preamble before a fragment', () => {
    const out = extractHtml('We need to output only the HTML.\n<section>hi</section>')
    expect(out.startsWith('<section>')).toBe(true)
  })

  it('drops trailing prose after the document', () => {
    const out = extractHtml('<!doctype html><html><body>ok</body></html>\n\nLet me know if you need changes!')
    expect(out.toLowerCase().endsWith('</html>')).toBe(true)
  })
})

describe('looksLikeHtml', () => {
  it('accepts a real document', () => {
    expect(looksLikeHtml('<!DOCTYPE html><html><body>hello world content</body></html>')).toBe(true)
  })

  it('rejects junk / too-short strings', () => {
    expect(looksLikeHtml('')).toBe(false)
    expect(looksLikeHtml('nope')).toBe(false)
    expect(looksLikeHtml('just some plain text with no tags at all')).toBe(false)
  })
})

describe('section-scoping', () => {
  it('extracts top-level sections with data-section-id or id', () => {
    const html = `
      <header data-section-id="header"><h1>Title</h1></header>
      <section id="hero" data-section-id="hero"><p>Hero text</p></section>
      <footer data-section-id="footer"><p>Copyright</p></footer>
    `;
    const sections = extractSections(html);
    expect(sections.length).toBe(3);
    expect(sections[0].id).toBe('header');
    expect(sections[1].id).toBe('hero');
    expect(sections[2].id).toBe('footer');
  });

  it('surgically replaces a specific section without touching others', () => {
    const original = `
      <header data-section-id="header"><h1>Old Title</h1></header>
      <section data-section-id="hero"><p>Old Hero</p></section>
      <footer data-section-id="footer"><p>Footer</p></footer>
    `;
    const updatedHero = '<section data-section-id="hero"><p>New Shiny Hero</p></section>';
    const result = replaceSectionById(original, 'hero', updatedHero);
    expect(result).toContain('New Shiny Hero');
    expect(result).toContain('<h1>Old Title</h1>');
    expect(result).toContain('<p>Footer</p>');
  });

  it('tags missing section IDs automatically', () => {
    const html = '<header><h1>Title</h1></header><section class="hero"><p>Hero</p></section>';
    const tagged = tagSectionsIfMissing(html);
    expect(tagged).toContain('data-section-id="header-1"');
    expect(tagged).toContain('data-section-id="section-2"');
  });
});
