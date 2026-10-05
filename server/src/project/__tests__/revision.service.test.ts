import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  repo: {
    findOwnedId: vi.fn(),
    findOwned: vi.fn(),
    findOwnedWithHistory: vi.fn(),
    addMessage: vi.fn(),
    createVersion: vi.fn(),
    update: vi.fn(),
  },
  credits: {
    chargeCredits: vi.fn(),
    freeCapReached: vi.fn(),
    refundCharge: vi.fn(),
    settleCharge: vi.fn(),
  },
  runtime: {
    acquireProjectLock: vi.fn(),
    releaseProjectLock: vi.fn(),
    pruneVersions: vi.fn(),
  },
  createChatCompletion: vi.fn(),
}));

vi.mock('@/project/project.repository.js', () => ({ projectRepository: m.repo }));
vi.mock('@/core/credits.js', () => m.credits);
vi.mock('@/project/project.runtime.js', () => ({ ...m.runtime, LOCK_TTL: { generation: 1, edit: 1 } }));
vi.mock('@/generation/llm.js', () => ({ createChatCompletion: m.createChatCompletion, EDIT_MODEL: 'standard-edit-model' }));
vi.mock('@/generation/images.js', () => ({ enhanceImages: async (html: string) => html }));

import { revisionService } from '@/project/revision.service.js';
import { resolveModel } from '@/generation/models.js';

const page = (heading: string) =>
  `<!DOCTYPE html><html><head><title>Sweet Crumbs Bakery</title></head><body><section id="hero"><h1>${heading}</h1></section></body></html>`;

const reply = (content: string, finish_reason = 'stop') => ({ choices: [{ message: { content }, finish_reason }], model: 'x' });

const project = (tier: string) => ({
  id: 'p1',
  model: tier,
  current_code: page('Fresh bread daily'),
  conversation: [
    { role: 'user', content: 'make a website for my bakery' },
    { role: 'assistant', content: "Here's what I changed:\n• Warmer colour palette" },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  m.repo.findOwnedId.mockResolvedValue({ id: 'p1' });
  m.repo.createVersion.mockResolvedValue({ id: 'v2' });
  m.repo.addMessage.mockResolvedValue({});
  m.repo.update.mockResolvedValue({});
  m.runtime.acquireProjectLock.mockResolvedValue('lock-1');
  m.runtime.releaseProjectLock.mockResolvedValue(undefined);
  m.runtime.pruneVersions.mockResolvedValue(undefined);
  m.credits.freeCapReached.mockResolvedValue(false);
  m.credits.chargeCredits.mockResolvedValue('charge-1');
  m.credits.refundCharge.mockResolvedValue(true);
  m.credits.settleCharge.mockResolvedValue(true);
});

describe('makeRevision', () => {
  it('edits a premium site with the premium model and remembers earlier changes', async () => {
    m.repo.findOwnedWithHistory.mockResolvedValue(project('premium'));
    m.createChatCompletion.mockResolvedValue(reply(`<!-- intent: edit\n- Bolder hero headline\n- Gradient background\n-->\n${page('Baked with love')}`));

    await revisionService.makeRevision('u1', 'p1', 'enhance the design');

    const params = m.createChatCompletion.mock.calls[0][0];
    expect(params.model).toBe(resolveModel('premium'));
    expect(params.messages[1].content).toContain('Warmer colour palette');
  });

  it('saves the new page without the summary and tells the user what changed', async () => {
    m.repo.findOwnedWithHistory.mockResolvedValue(project('free'));
    m.createChatCompletion.mockResolvedValue(reply(`<!-- intent: edit\n- Bolder hero headline\n- Gradient background\n-->\n${page('Baked with love')}`));

    await revisionService.makeRevision('u1', 'p1', 'enhance the design');

    const saved = m.repo.createVersion.mock.calls[0][0].code;
    expect(saved).toContain('Baked with love');
    expect(saved).not.toContain('intent:');
    expect(m.repo.addMessage).toHaveBeenLastCalledWith('p1', 'assistant', "Here's what I changed:\n• Bolder hero headline\n• Gradient background");
    expect(m.credits.settleCharge).toHaveBeenCalledWith('charge-1');
    expect(m.credits.refundCharge).not.toHaveBeenCalled();
    expect(m.runtime.releaseProjectLock).toHaveBeenCalledWith('p1', 'lock-1');
  });

  it('refuses a request for a different website, refunds, and saves nothing', async () => {
    m.repo.findOwnedWithHistory.mockResolvedValue(project('premium'));
    m.createChatCompletion.mockResolvedValue(reply('<!-- intent: new-site -->'));

    await expect(revisionService.makeRevision('u1', 'p1', 'make it a gym website instead')).rejects.toMatchObject({ status: 422 });

    expect(m.credits.refundCharge).toHaveBeenCalledWith('charge-1');
    expect(m.credits.settleCharge).not.toHaveBeenCalled();
    expect(m.repo.createVersion).not.toHaveBeenCalled();
    expect(m.repo.update).not.toHaveBeenCalled();
    expect(m.runtime.releaseProjectLock).toHaveBeenCalledWith('p1', 'lock-1');
  });

  it('refunds and keeps the current page when the output is cut off', async () => {
    m.repo.findOwnedWithHistory.mockResolvedValue(project('free'));
    m.createChatCompletion.mockResolvedValue(reply(`<!-- intent: edit\n- x\n-->\n${page('half')}`, 'length'));

    await expect(revisionService.makeRevision('u1', 'p1', 'enhance')).rejects.toMatchObject({ status: 502 });

    expect(m.credits.refundCharge).toHaveBeenCalledWith('charge-1');
    expect(m.repo.createVersion).not.toHaveBeenCalled();
  });

  it('does not call the AI when the user cannot pay', async () => {
    m.repo.findOwnedWithHistory.mockResolvedValue(project('free'));
    m.credits.chargeCredits.mockResolvedValue(null);

    await expect(revisionService.makeRevision('u1', 'p1', 'enhance')).rejects.toMatchObject({ status: 403 });

    expect(m.createChatCompletion).not.toHaveBeenCalled();
    expect(m.runtime.releaseProjectLock).toHaveBeenCalled();
  });
});

describe('editElement', () => {
  const section = '<section id="hero" class="p-8"><h1>Fresh bread daily</h1></section>';

  it('edits a section with the tier model and settles the charge', async () => {
    m.repo.findOwned.mockResolvedValue(project('premium'));
    m.createChatCompletion.mockResolvedValue(reply('<section id="hero" class="p-12 bg-amber-50"><h1>Fresh bread daily</h1></section>'));

    const html = await revisionService.editElement('u1', 'p1', section, 'add a warm background');

    expect(html).toContain('bg-amber-50');
    expect(m.createChatCompletion.mock.calls[0][0].model).toBe(resolveModel('premium'));
    expect(m.credits.settleCharge).toHaveBeenCalledWith('charge-1');
  });

  it('rejects a selection covering most of the page before charging', async () => {
    const p = project('premium');
    m.repo.findOwned.mockResolvedValue(p);

    await expect(revisionService.editElement('u1', 'p1', p.current_code, 'make it a gym site')).rejects.toMatchObject({ status: 400 });

    expect(m.credits.chargeCredits).not.toHaveBeenCalled();
    expect(m.createChatCompletion).not.toHaveBeenCalled();
  });

  it('refunds when the edited element is cut off', async () => {
    m.repo.findOwned.mockResolvedValue(project('free'));
    m.createChatCompletion.mockResolvedValue(reply('<section id="hero" class="p-12"><h1>Fresh br', 'length'));

    await expect(revisionService.editElement('u1', 'p1', section, 'bigger heading')).rejects.toMatchObject({ status: 502 });

    expect(m.credits.refundCharge).toHaveBeenCalledWith('charge-1');
    expect(m.credits.settleCharge).not.toHaveBeenCalled();
  });
});
