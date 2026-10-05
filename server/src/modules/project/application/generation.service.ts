import { ConflictError, NotFoundError } from '@/shared/http/AppError.js';
import { projectRepository } from '@/modules/project/data/project.repository.js';
import { generating, acquireProjectLock, releaseProjectLock, LOCK_TTL } from '@/modules/project/domain/project.runtime.js';

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
        const token = await acquireProjectLock(projectId, userId, LOCK_TTL.edit);
        if (!token) throw new ConflictError('This project is busy — please wait for the current change to finish.');
        try {
            await projectRepository.update(projectId, { current_code: null, current_version_index: '' });
        } finally {
            await releaseProjectLock(projectId, token).catch(() => {});
        }
    },
};
