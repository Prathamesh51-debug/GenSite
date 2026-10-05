import { randomUUID } from 'node:crypto';
import prisma from '@/platform/db/prisma.js';
import { LIMITS } from '@/shared/config/constants.js';

export const generating = new Map<string, AbortController>();

export const LOCK_TTL = {
    generation: 20 * 60_000,
    edit: 10 * 60_000,
} as const;

type LeaseDb = { websiteProject: Pick<typeof prisma.websiteProject, 'updateMany'> };

export const acquireProjectLock = async (
    projectId: string,
    userId: string,
    ttlMs: number,
    db: LeaseDb = prisma,
    now = new Date()
): Promise<string | null> => {
    const token = randomUUID();
    const { count } = await db.websiteProject.updateMany({
        where: {
            id: projectId,
            userId,
            OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
        },
        data: { lockToken: token, lockedUntil: new Date(now.getTime() + ttlMs) },
    });
    return count > 0 ? token : null;
};

export const releaseProjectLock = async (projectId: string, token: string, db: LeaseDb = prisma): Promise<void> => {
    await db.websiteProject.updateMany({
        where: { id: projectId, lockToken: token },
        data: { lockToken: null, lockedUntil: null },
    });
};

export const pruneVersions = async (projectId: string): Promise<void> => {
    const stale = await prisma.version.findMany({
        where: { projectId },
        orderBy: { timestamp: 'desc' },
        skip: LIMITS.versionHistory,
        select: { id: true },
    });
    if (stale.length) {
        await prisma.version.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
    }
};
