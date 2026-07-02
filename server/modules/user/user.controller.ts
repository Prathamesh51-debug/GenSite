import type { Request, Response } from 'express';
import { userService } from './user.service.js';

export const getUserCredits = async (req: Request, res: Response) => {
    res.json({ credits: await userService.getCredits(req.userId!) });
};

export const createUserProject = async (req: Request, res: Response) => {
    const { initial_prompt, model } = req.body as { initial_prompt: string; model?: string | null };
    const projectId = await userService.createProject(req.userId!, initial_prompt, model ?? null);
    res.json({ projectId });
};

export const getUserProject = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    res.json({ project: await userService.getProject(req.userId!, projectId) });
};

export const getUserProjects = async (req: Request, res: Response) => {
    res.json({ projects: await userService.listProjects(req.userId!) });
};

export const togglePublish = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    res.json({ message: await userService.togglePublish(req.userId!, projectId) });
};

// Public — the client renders pricing from this so it can't drift from what we charge.
export const getPlans = async (_req: Request, res: Response) => {
    res.json({ plans: userService.plans() });
};

// Public — the model catalog the user picks their generation model from.
export const getModels = async (_req: Request, res: Response) => {
    res.json({ models: userService.models() });
};
