import { describe, it, expect, beforeEach } from 'vitest';
import { acquireProjectLock, releaseProjectLock, LOCK_TTL } from '@/project/project.runtime.js';
import { resetDatabase, createUser, createGeneratedProject } from './helpers.js';

beforeEach(resetDatabase);

describe('project lease on real Postgres', () => {
  it('admits exactly one of ten simultaneous requests', async () => {
    const user = await createUser();
    const { project } = await createGeneratedProject(user.id);

    const tokens = await Promise.all(Array.from({ length: 10 }, () => acquireProjectLock(project.id, user.id, LOCK_TTL.edit)));

    expect(tokens.filter(Boolean)).toHaveLength(1);
  });

  it('frees the project only when the holder releases it', async () => {
    const user = await createUser();
    const { project } = await createGeneratedProject(user.id);
    const token = (await acquireProjectLock(project.id, user.id, LOCK_TTL.edit))!;

    await releaseProjectLock(project.id, 'not-the-holder');
    expect(await acquireProjectLock(project.id, user.id, LOCK_TTL.edit)).toBeNull();

    await releaseProjectLock(project.id, token);
    expect(await acquireProjectLock(project.id, user.id, LOCK_TTL.edit)).toBeTruthy();
  });

  it('lets a new request take over once a crashed holder\'s lease has expired', async () => {
    const user = await createUser();
    const { project } = await createGeneratedProject(user.id);
    await acquireProjectLock(project.id, user.id, LOCK_TTL.edit);

    const later = new Date(Date.now() + LOCK_TTL.edit + 1_000);
    expect(await acquireProjectLock(project.id, user.id, LOCK_TTL.edit, undefined, later)).toBeTruthy();
  });

  it('never lets another user lock someone else\'s project', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { project } = await createGeneratedProject(owner.id);

    expect(await acquireProjectLock(project.id, stranger.id, LOCK_TTL.edit)).toBeNull();
  });
});
