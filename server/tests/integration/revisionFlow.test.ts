import { describe, it, expect, vi, beforeEach } from 'vitest';

const createChatCompletion = vi.hoisted(() => vi.fn());
vi.mock('@/generation/llm.js', () => ({ createChatCompletion, EDIT_MODEL: 'standard-edit-model' }));

import { revisionService } from '@/project/revision.service.js';
import { acquireProjectLock, pruneVersions, LOCK_TTL } from '@/project/project.runtime.js';
import { prisma, resetDatabase, createUser, creditsOf, createGeneratedProject, page } from './helpers.js';

const aiReply = (content: string) => ({ model: 'standard-edit-model', choices: [{ message: { content }, finish_reason: 'stop' }] });

beforeEach(async () => {
  await resetDatabase();
  createChatCompletion.mockReset();
});

describe('edit → save → roll back on real Postgres', () => {
  it('restores version 1 exactly after an AI edit and a manual save', async () => {
    const user = await createUser(25);
    const v1Html = page('Fresh bread daily');
    const { project, version: v1 } = await createGeneratedProject(user.id, v1Html);

    createChatCompletion.mockResolvedValue(aiReply(`<!-- intent: edit\n- Warmer hero headline\n-->\n${page('Baked with love every dawn')}`));
    await revisionService.makeRevision(user.id, project.id, 'make the hero headline warmer');

    const afterEdit = await prisma.websiteProject.findUniqueOrThrow({ where: { id: project.id } });
    expect(afterEdit.current_code).toContain('Baked with love every dawn');
    expect(await creditsOf(user.id)).toBe(20);
    expect(await prisma.creditCharge.findFirstOrThrow({ where: { userId: user.id } })).toMatchObject({ status: 'settled', kind: 'revision' });
    const reply = await prisma.conversation.findFirstOrThrow({ where: { projectId: project.id, role: 'assistant' } });
    expect(reply.content).toBe("Here's what I changed:\n• Warmer hero headline");

    await revisionService.save(user.id, project.id, page('Hand-edited headline'));
    expect(await prisma.version.count({ where: { projectId: project.id } })).toBe(3);

    await revisionService.rollback(user.id, project.id, v1.id);

    const rolledBack = await prisma.websiteProject.findUniqueOrThrow({ where: { id: project.id } });
    expect(rolledBack.current_code).toBe(v1Html);
    expect(rolledBack.current_version_index).toBe(v1.id);
    expect(rolledBack.lockToken).toBeNull();
  });

  it('refunds and saves nothing when the AI rebuilds the site as another business', async () => {
    const user = await createUser(25);
    const { project } = await createGeneratedProject(user.id);
    const gym = '<!DOCTYPE html><html><head><title>IronFit Gym</title></head><body><section id="hero"><h1>Train harder with certified coaches every single day</h1></section></body></html>';
    createChatCompletion.mockResolvedValue(aiReply(`<!-- intent: edit\n- Rebuilt as a gym\n-->\n${gym}`));

    await expect(revisionService.makeRevision(user.id, project.id, 'turn it into my gym site')).rejects.toMatchObject({ status: 422 });

    expect(await creditsOf(user.id)).toBe(25);
    expect(await prisma.version.count({ where: { projectId: project.id } })).toBe(1);
    expect((await prisma.creditCharge.findFirstOrThrow({ where: { userId: user.id } })).status).toBe('refunded');
  });

  it('rejects an edit while another change holds the project, without charging', async () => {
    const user = await createUser(25);
    const { project } = await createGeneratedProject(user.id);
    await acquireProjectLock(project.id, user.id, LOCK_TTL.edit);

    await expect(revisionService.makeRevision(user.id, project.id, 'enhance')).rejects.toMatchObject({ status: 409 });

    expect(createChatCompletion).not.toHaveBeenCalled();
    expect(await creditsOf(user.id)).toBe(25);
  });

  it('keeps only the newest 20 versions', async () => {
    const user = await createUser();
    const { project } = await createGeneratedProject(user.id);
    for (let i = 0; i < 24; i++) {
      await prisma.version.create({ data: { code: page(`v${i}`), description: `v${i}`, projectId: project.id, timestamp: new Date(Date.now() + i * 1000) } });
    }

    await pruneVersions(project.id);

    const kept = await prisma.version.findMany({ where: { projectId: project.id }, orderBy: { timestamp: 'desc' } });
    expect(kept).toHaveLength(20);
    expect(kept[0].description).toBe('v23');
  });
});
