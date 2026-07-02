import prisma from '../../shared/lib/prisma.js';

export const userRepository = {
    findById: (id: string) => prisma.user.findUnique({ where: { id } }),

    // Create the project and seed its first message atomically. totalCreation is NOT
    // bumped here — an un-generated draft isn't a "creation" (that happens on the
    // first successful build).
    createProjectWithMessage: (userId: string, name: string, initialPrompt: string, model: string | null) =>
        prisma.$transaction(async (tx) => {
            const created = await tx.websiteProject.create({
                data: { name, initial_prompt: initialPrompt, model, userId },
            });
            await tx.conversation.create({
                data: { role: 'user', content: initialPrompt, projectId: created.id },
            });
            return created;
        }),

    findProject: (id: string, userId: string) =>
        prisma.websiteProject.findUnique({
            where: { id, userId },
            include: {
                conversation: { orderBy: { timestamp: 'asc' } },
                versions: {
                    orderBy: { timestamp: 'asc' },
                    select: { id: true, description: true, timestamp: true, projectId: true },
                },
            },
        }),

    findProjectOwned: (id: string, userId: string) =>
        prisma.websiteProject.findUnique({ where: { id, userId } }),

    listProjects: (userId: string) =>
        prisma.websiteProject.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true, name: true, initial_prompt: true,
                isPublished: true, createdAt: true, updatedAt: true,
            },
        }),

    setPublished: (id: string, isPublished: boolean) =>
        prisma.websiteProject.update({ where: { id }, data: { isPublished } }),
};
