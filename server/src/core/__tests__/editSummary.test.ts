import { describe, it, expect } from 'vitest';
import { parseEditSummary, stripEditSummary, describeChanges, formatEditHistory } from '../editSummary.js';
import { extractHtml } from '../html.js';

const doc = '<!DOCTYPE html><html><head><title>Bakery</title></head><body><section id="hero">Hi</section></body></html>';

describe('parseEditSummary', () => {
  it('reads the intent and the list of changes', () => {
    const raw = `<!-- intent: edit\n- Bolder hero headline\n- Gradient section backgrounds\n* Hover lift on menu cards\n-->\n${doc}`;
    expect(parseEditSummary(raw)).toEqual({
      intent: 'edit',
      changes: ['Bolder hero headline', 'Gradient section backgrounds', 'Hover lift on menu cards'],
    });
  });

  it('recognises a new-site request in its common spellings', () => {
    for (const label of ['new-site', 'new site', 'NEW_SITE']) {
      expect(parseEditSummary(`<!-- intent: ${label} -->`).intent).toBe('new-site');
    }
  });

  it('survives markdown fences around the output', () => {
    const raw = '```html\n<!-- intent: edit\n- Larger type scale\n-->\n' + doc + '\n```';
    expect(parseEditSummary(raw)).toEqual({ intent: 'edit', changes: ['Larger type scale'] });
  });

  it('returns no intent and no changes when the summary is missing', () => {
    expect(parseEditSummary(doc)).toEqual({ intent: null, changes: [] });
    expect(parseEditSummary(null)).toEqual({ intent: null, changes: [] });
  });

  it('caps the number and length of change lines', () => {
    const lines = Array.from({ length: 9 }, (_, i) => `- change ${i} ${'x'.repeat(200)}`).join('\n');
    const { changes } = parseEditSummary(`<!-- intent: edit\n${lines}\n-->`);
    expect(changes).toHaveLength(6);
    expect(changes.every((c) => c.length <= 140)).toBe(true);
  });

  it('ignores ordinary HTML comments in the page', () => {
    expect(parseEditSummary(`${doc}<!-- footer starts here -->`).intent).toBeNull();
  });
});

describe('summary never reaches the saved page', () => {
  it('is dropped by HTML extraction when it precedes the document', () => {
    const raw = `<!-- intent: edit\n- Bolder hero\n-->\n${doc}`;
    expect(extractHtml(raw)).not.toContain('intent:');
  });

  it('is stripped even if the model puts it inside the document', () => {
    const html = doc.replace('<body>', '<body><!-- intent: edit\n- x\n-->');
    expect(stripEditSummary(html)).not.toContain('intent:');
    expect(stripEditSummary(html)).toContain('<section id="hero">');
  });
});

describe('describeChanges', () => {
  it('lists the changes as bullets for the chat', () => {
    expect(describeChanges(['A', 'B'])).toBe("Here's what I changed:\n• A\n• B");
  });

  it('falls back to a generic message without a summary', () => {
    expect(describeChanges([])).toMatch(/made the changes/);
  });
});

describe('formatEditHistory', () => {
  it('includes what the assistant changed, not only what the user asked', () => {
    const history = formatEditHistory([
      { role: 'user', content: 'make a website for my bakery' },
      { role: 'assistant', content: "Here's what I changed:\n• Gradient hero" },
      { role: 'user', content: 'make that gradient stronger' },
    ]);
    expect(history).toContain('User: make a website for my bakery');
    expect(history).toContain('You: Here');
    expect(history).toContain('Gradient hero');
  });

  it('keeps only the most recent messages, trimmed', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ role: 'user', content: `request ${i} ${'x'.repeat(600)}` }));
    const history = formatEditHistory(many);
    expect(history).not.toContain('request 3 ');
    expect(history).toContain('request 11 ');
    expect(history.split('\n').every((line) => line.length <= 410)).toBe(true);
  });

  it('is empty for a new conversation', () => {
    expect(formatEditHistory([])).toBe('');
  });
});
