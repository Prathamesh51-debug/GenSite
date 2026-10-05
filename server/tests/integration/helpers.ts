import { randomUUID } from 'node:crypto';
import prisma from '@/platform/prisma.js';

export { prisma };

export const resetDatabase = async (): Promise<void> => {
    await prisma.$executeRawUnsafe(
        'TRUNCATE "user", "WebsiteProject", "Conversation", "Version", "Transaction", "CreditCharge", "session", "account", "verification" CASCADE'
    );
};

export const createUser = (credits = 25) =>
    prisma.user.create({
        data: { id: randomUUID(), email: `${randomUUID()}@test.local`, name: 'Test User', credits },
    });

export const creditsOf = async (userId: string): Promise<number> =>
    (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).credits;

export const page = (heading: string) =>
    `<!DOCTYPE html><html><head><title>Crumb &amp; Co. Bakery</title></head><body><section id="hero" data-section-id="hero"><h1>${heading}</h1><p>Fresh bread every morning from our ovens to your table.</p></section></body></html>`;

export const createGeneratedProject = async (userId: string, html = page('Fresh bread daily'), tier = 'free') => {
    const project = await prisma.websiteProject.create({
        data: { name: 'Bakery', initial_prompt: 'make a website for my bakery', model: tier, userId, current_code: html },
    });
    const version = await prisma.version.create({ data: { code: html, description: 'Initial version', projectId: project.id } });
    await prisma.conversation.create({ data: { role: 'user', content: 'make a website for my bakery', projectId: project.id } });
    await prisma.websiteProject.update({ where: { id: project.id }, data: { current_version_index: version.id } });
    return { project, version };
};
