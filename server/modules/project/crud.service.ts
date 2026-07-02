import { projectRepository } from './project.repository.js';
import { NotFoundError } from '../../shared/http/AppError.js';
import { COMMUNITY_PAGE_SIZE } from '../../shared/config/constants.js';

// Read + lifecycle operations that don't involve the LLM or credits.
export const crudService = {
    async remove(id: string, userId: string) {
        const project = await projectRepository.findOwned(id, userId);
        if (!project) throw new NotFoundError('Project not found');
        await projectRepository.delete(id, userId);
    },

    async thumbnail(id: string, userId: string) {
        const project = await projectRepository.findThumbnail(id, userId);
        if (!project) throw new NotFoundError('Project not found');
        return project.current_code || '';
    },

    async preview(id: string, userId: string) {
        const project = await projectRepository.findPreview(id, userId);
        if (!project) throw new NotFoundError('Project not found');
        return project;
    },

    async versionBody(projectId: string, versionId: string, userId: string) {
        const owned = await projectRepository.findOwnedId(projectId, userId);
        if (!owned) throw new NotFoundError('Project not found');
        const version = await projectRepository.findVersion(versionId, projectId);
        if (!version) throw new NotFoundError('Version not found');
        return { code: version.code, files: version.files ?? null };
    },

    async published(page: number) {
        const rows = await projectRepository.findPublishedPage(page);
        const hasMore = rows.length > COMMUNITY_PAGE_SIZE;
        return { projects: rows.slice(0, COMMUNITY_PAGE_SIZE), hasMore };
    },

    async publicById(id: string) {
        const project = await projectRepository.findPublishedById(id);
        if (!project || project.isPublished === false || !project.current_code) {
            throw new NotFoundError('Project not found');
        }
        return { code: project.current_code, files: project.files ?? null };
    },

    async duplicate(id: string, userId: string) {
        const src = await projectRepository.findOwned(id, userId);
        if (!src) throw new NotFoundError('Project not found');
        const copy = await projectRepository.duplicate(src, userId);
        return copy.id;
    },
};
