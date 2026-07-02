import { ConflictError, NotFoundError } from '../../shared/http/AppError.js';
import { projectRepository } from './project.repository.js';
import { generating } from './project.runtime.js';

export const generationService = {
    // Cancel an in-flight generation. The stream's own catch refunds the charge.
    async cancel(userId: string, projectId: string) {
        const owned = await projectRepository.findOwnedId(projectId, userId);
        if (!owned) throw new NotFoundError('Project not found');
        generating.get(projectId)?.abort();
    },

    // Clear the current build so the project regenerates from its original prompt.
    async regenerate(userId: string, projectId: string) {
        const owned = await projectRepository.findOwnedId(projectId, userId);
        if (!owned) throw new NotFoundError('Project not found');
        if (generating.has(projectId)) throw new ConflictError('This project is already generating.');
        await projectRepository.update(projectId, { current_code: null, current_version_index: '' });
    },
};
