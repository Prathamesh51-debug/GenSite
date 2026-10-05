import type { Request, Response } from 'express';
import { revisionService } from '@/project/revision.service.js';

export const makeRevision = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    const { message } = req.body as { message: string };
    await revisionService.makeRevision(req.userId!, projectId, message);
    res.json({ message: 'Changes made successfully' });
};

export const editElement = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    const { html, message } = req.body as { html: string; message: string };
    const newHtml = await revisionService.editElement(req.userId!, projectId, html, message);
    res.json({ html: newHtml });
};

export const saveProjectCode = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    const { code } = req.body as { code: string };
    const message = await revisionService.save(req.userId!, projectId, code);
    res.json({ message });
};

export const rollbackToVersion = async (req: Request, res: Response) => {
    const { projectId, versionId } = req.params as { projectId: string; versionId: string };
    await revisionService.rollback(req.userId!, projectId, versionId);
    res.json({ message: 'Version rolled back' });
};
