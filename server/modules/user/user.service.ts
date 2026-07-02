import { userRepository } from './user.repository.js';
import { NotFoundError, InsufficientCreditsError } from '../../shared/http/AppError.js';
import { MIN_CREDITS_TO_CREATE } from '../../shared/config/constants.js';
import { isValidModel, MODELS } from '../../shared/lib/models.js';
import { PLANS } from '../../shared/lib/plans.js';

export const userService = {
    async getCredits(userId: string) {
        const user = await userRepository.findById(userId);
        if (!user) throw new NotFoundError('User not found');
        return user.credits;
    },

    // Soft balance gate for UX only — the authoritative, race-safe charge happens at
    // generation time, not here.
    async createProject(userId: string, initialPrompt: string, model: string | null) {
        const user = await userRepository.findById(userId);
        if (!user) throw new NotFoundError('User not found');
        if (user.credits < MIN_CREDITS_TO_CREATE) {
            throw new InsufficientCreditsError('add credits to create more projects');
        }
        const name = initialPrompt.length > 50 ? initialPrompt.substring(0, 47) + '...' : initialPrompt;
        const project = await userRepository.createProjectWithMessage(
            userId, name, initialPrompt, isValidModel(model) ? model : null,
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
    models: () => MODELS,
};
