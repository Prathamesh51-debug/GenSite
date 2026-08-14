import { userRepository } from '@/modules/user/data/user.repository.js';
import { NotFoundError, InsufficientCreditsError } from '@/shared/http/AppError.js';
import { MIN_CREDITS_TO_CREATE } from '@/shared/config/constants.js';
import { isValidTier, TIERS } from '@/generation/providers/models.js';
import { PLANS } from '@/core/plans.js';

export const userService = {
    async getCredits(userId: string) {
        const user = await userRepository.findById(userId);
        if (!user) throw new NotFoundError('User not found');
        return user.credits;
    },

    async createProject(userId: string, initialPrompt: string, model: string | null) {
        const user = await userRepository.findById(userId);
        if (!user) throw new NotFoundError('User not found');
        if (user.credits < MIN_CREDITS_TO_CREATE) {
            throw new InsufficientCreditsError('add credits to create more projects');
        }
        const name = initialPrompt.length > 50 ? initialPrompt.substring(0, 47) + '...' : initialPrompt;
        const project = await userRepository.createProjectWithMessage(
            userId, name, initialPrompt, isValidTier(model) ? model : 'free',
        );
        return project.id;
    },

    async getProject(userId: string, projectId: string) {
        const project = await userRepository.findProject(projectId, userId);
        if (!project) throw new NotFoundError('Project not found');
        return project;
    },

    listProjects: (userId: string) => userRepository.listProjects(userId),

    async togglePublish(userId: string, projectId: string) {
        const project = await userRepository.findProjectOwned(projectId, userId);
        if (!project) throw new NotFoundError('project not found');
        await userRepository.setPublished(projectId, !project.isPublished);
        return project.isPublished ? 'Project Unpublished' : 'Project Published Successfully';
    },

    plans: () => PLANS,
    models: () => TIERS,
};
