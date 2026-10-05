import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => { process.env.AI_API_KEY ??= 'test-key'; });

import { editModel, resolveModel, generationCost } from '@/generation/models.js';
import { EDIT_MODEL } from '@/generation/llm.js';

describe('tier routing', () => {
  it('edits premium projects with the same model that generated them', () => {
    expect(editModel('premium')).toBe(resolveModel('premium'));
    expect(editModel('premium')).not.toBe(EDIT_MODEL);
  });

  it('edits free and legacy projects with the standard edit model', () => {
    expect(editModel('free')).toBe(EDIT_MODEL);
    expect(editModel(null)).toBe(EDIT_MODEL);
    expect(editModel(undefined)).toBe(EDIT_MODEL);
  });

  it('charges premium generation at four times the free price', () => {
    expect(generationCost('premium')).toBe(generationCost('free') * 4);
  });
});
