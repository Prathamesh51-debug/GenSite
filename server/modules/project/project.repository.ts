import prisma from '../../shared/lib/prisma.js';
import { COMMUNITY_PAGE_SIZE } from '../../shared/config/constants.js';

// All database access for the project domain lives here. Services orchestrate; this
// layer is the only thing that talks to Prisma, so the storage shape can change
// without touching business logic.
export const projectRepository = {
    findOwned: (id: string, userId: string) =>
        prisma.websiteProject.findUnique({ where: { id, userId } }),

    findOwnedId: (id: string, userId: string) =>
        prisma.websiteProject.findFirst({ where: { id, userId }, select: { id: true } }),

    findOwnedWithHistory: (id: string, userId: string) =>
        prisma.websiteProject.findUnique({
            where: { id, userId },
            include: { versions: true, conversation: { orderBy: { timestamp: 'asc' } } },
        }),

    findThumbnail: (id: string, userId: string) =>
        prisma.websiteProject.findFirst({ where: { id, userId }, select: { current_code: true } }),

    findPreview: (id: string, userId: string) =>
        prisma.websiteProject.findFirst({
            where: { id, userId },
            select: {
                id: true, name: true, current_code: true, files: true,
                current_version_index: true, isPublished: true,
                versions: {
                    orderBy: { timestamp: 'asc' },
                    select: { id: true, description: true, timestamp: true, projectId: true },
                },
            },
        }),

    findPublishedById: (id: string) =>
        prisma.websiteProject.findFirst({ where: { id } }),

    // One extra row so the caller can tell whether another page exists.
    findPublishedPage: (page: number) =>
        prisma.websiteProject.findMany({
            where: { isPublished: true },
            select: {
                id: true, name: true, initial_prompt: true, createdAt: true, isPublished: true,
                user: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * COMMUNITY_PAGE_SIZE,
            take: COMMUNITY_PAGE_SIZE + 1,
        }),

    findVersion: (versionId: string, projectId: string) =>
        prisma.version.findFirst({
            where: { id: versionId, projectId },
            select: { id: true, code: true, files: true },
        }),

    countVersions: (projectId: string) =>
        prisma.version.count({ where: { projectId } }),

    addMessage: (projectId: string, role: 'user' | 'assistant', content: string) =>
        prisma.conversation.create({ data: { role, content, projectId } }),

    createVersion: (data: { code: string; files?: unknown; description: string; projectId: string }) =>
        prisma.version.create({ data: data as any }),

    update: (id: string, data: Record<string, unknown>) =>
        prisma.websiteProject.update({ where: { id }, data: data as any }),

    delete: (id: string, userId: string) =>
        prisma.websiteProject.delete({ where: { id, userId } }),

    incrementCreation: (userId: string) =>
        prisma.user.update({ where: { id: userId }, data: { totalCreation: { increment: 1 } } }),

    // Duplicate a project + seed a first version + bump the owner's creation count,
    // all atomically.
    duplicate: (src: any, userId: string) =>
        prisma.$transaction(async (tx) => {
            const created = await tx.websiteProject.create({
                data: {
                    name: `${src.name} (copy)`.slice(0, 100),
                    initial_prompt: src.initial_prompt,
                    current_code: src.current_code,
                    files: (src.files ?? undefined) as any,
                    model: src.model,
                    current_version_index: '',
                    userId,
                },
            });
            if (created.current_code) {
                const version = await tx.version.create({
                    data: {
                        code: created.current_code,
                        files: (src.files ?? undefined) as any,
                        description: 'Duplicated',
                        projectId: created.id,
                    },
                });
                await tx.websiteProject.update({
                    where: { id: created.id },
                    data: { current_version_index: version.id },
                });
            }
            await tx.user.update({ where: { id: userId }, data: { totalCreation: { increment: 1 } } });
            return created;
        }),
};
