import type { Request, Response } from 'express';
import { crudService } from './crud.service.js';

// req.userId is guaranteed by the `protect` middleware on these routes.

export const deleteProject = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    await crudService.remove(projectId, req.userId!);
    res.json({ message: 'Project deleted successfully' });
};

export const getProjectThumbnail = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    res.json({ code: await crudService.thumbnail(projectId, req.userId!) });
};

export const getProjectPreview = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    res.json({ project: await crudService.preview(projectId, req.userId!) });
};

export const getProjectVersion = async (req: Request, res: Response) => {
    const { projectId, versionId } = req.params as { projectId: string; versionId: string };
    res.json(await crudService.versionBody(projectId, versionId, req.userId!));
};

export const duplicateProject = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    res.json({ projectId: await crudService.duplicate(projectId, req.userId!) });
};

// Public — community gallery.
export const getPublishedProjects = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    res.json(await crudService.published(page));
};

// Public — single published project.
export const getProjectById = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    res.json(await crudService.publicById(projectId));
};
