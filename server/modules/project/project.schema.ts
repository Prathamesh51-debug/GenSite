import { z } from 'zod';
import { LIMITS } from '../../shared/config/constants.js';

export const projectIdParams = z.object({ projectId: z.string().min(1) });

export const versionParams = z.object({
    projectId: z.string().min(1),
    versionId: z.string().min(1),
});

export const revisionBody = z.object({
    message: z.string().trim()
        .min(1, 'Please enter a valid prompt')
        .max(LIMITS.messageMaxChars, 'Message is too long (max 2000 characters).'),
    path: z.string().optional(),
});

export const editElementBody = z.object({
    message: z.string().trim()
        .min(1, 'Please enter a valid prompt')
        .max(LIMITS.messageMaxChars, 'Message is too long (max 2000 characters).'),
    html: z.string().min(1, 'No element selected'),
});

export const saveBody = z.object({
    code: z.string()
        .min(1, 'Code is required')
        .max(LIMITS.pageMaxBytes, 'That page is too large to save.'),
    path: z.string().optional(),
});
