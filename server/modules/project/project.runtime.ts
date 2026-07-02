import prisma from '../../shared/lib/prisma.js';
import { LIMITS } from '../../shared/config/constants.js';

// projectId -> AbortController for the running generation. Doubles as the
// duplicate-start guard and the cancel handle. Process-local (single node).
export const generating = new Map<string, AbortController>();

// Per-project lock serializing AI revisions, element edits and manual saves so two
// writers can't race current_code / current_version_index.
export const editing = new Set<string>();

// Keep only the most recent N versions per project; older snapshots fall out.
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
