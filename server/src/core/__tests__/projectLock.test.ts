import { describe, it, expect, vi } from 'vitest';

vi.mock('@/platform/db/prisma.js', () => ({ default: {} }));

import { acquireProjectLock, releaseProjectLock } from '@/modules/project/domain/project.runtime.js';

const makeDb = () => {
  const row: any = { id: 'p1', userId: 'u1', lockToken: null, lockedUntil: null };
  const matches = (where: any) => {
    if (where.id !== row.id) return false;
    if (where.userId && where.userId !== row.userId) return false;
    if (where.lockToken && where.lockToken !== row.lockToken) return false;
    if (where.OR) {
      const now = where.OR[1].lockedUntil.lt;
      return row.lockedUntil === null || row.lockedUntil < now;
    }
    return true;
  };
  const db = {
    websiteProject: {
      updateMany: async ({ where, data }: any) => {
        if (!matches(where)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
  } as any;
  return { db, row };
};

describe('project lease', () => {
  it('admits one holder at a time', async () => {
    const { db } = makeDb();
    const [a, b] = await Promise.all([
      acquireProjectLock('p1', 'u1', 60_000, db),
      acquireProjectLock('p1', 'u1', 60_000, db),
    ]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it('rejects other users', async () => {
    const { db } = makeDb();
    expect(await acquireProjectLock('p1', 'intruder', 60_000, db)).toBeNull();
  });

  it('only the holder can release it', async () => {
    const { db, row } = makeDb();
    const token = (await acquireProjectLock('p1', 'u1', 60_000, db))!;
    await releaseProjectLock('p1', 'not-the-token', db);
    expect(row.lockToken).toBe(token);
    await releaseProjectLock('p1', token, db);
    expect(row.lockToken).toBeNull();
    expect(await acquireProjectLock('p1', 'u1', 60_000, db)).toBeTruthy();
  });

  it('an expired lease from a crashed holder can be taken over', async () => {
    const { db } = makeDb();
    const t0 = new Date('2026-10-05T00:00:00Z');
    expect(await acquireProjectLock('p1', 'u1', 60_000, db, t0)).toBeTruthy();
    expect(await acquireProjectLock('p1', 'u1', 60_000, db, new Date(t0.getTime() + 30_000))).toBeNull();
    expect(await acquireProjectLock('p1', 'u1', 60_000, db, new Date(t0.getTime() + 61_000))).toBeTruthy();
  });
});
