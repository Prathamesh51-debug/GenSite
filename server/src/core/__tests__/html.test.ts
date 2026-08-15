import { describe, it, expect } from 'vitest'
import { extractHtml, looksLikeHtml } from '../html'

describe('extractHtml', () => {
  it('returns empty string for null/empty input', () => {
    expect(extractHtml(null)).toBe('')
    expect(extractHtml('')).toBe('')
    expect(extractHtml('   ')).toBe('')
  })

  it('strips markdown code fences', () => {
    const out = extractHtml('```html\n<!DOCTYPE html><html></html>\n```')
    expect(out.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(out).not.toContain('```')
  })

  it('discards preamble before the document', () => {
    const out = extractHtml('Here is your site:\n<!doctype html><html><body>hi</body></html>')
    expect(out.toLowerCase().startsWith('<!doctype html>')).toBe(true)
  })

  it('keeps a clean document unchanged', () => {
    const doc = '<!DOCTYPE html><html><body>ok</body></html>'
    expect(extractHtml(doc)).toBe(doc)
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
