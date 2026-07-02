import { z } from 'zod';
import { LIMITS } from '../../shared/config/constants.js';

export const createProjectBody = z.object({
    initial_prompt: z.string().trim()
        .min(1, 'Initial prompt is required')
        .max(LIMITS.promptMaxChars, 'Prompt is too long (max 2000 characters).'),
    model: z.string().nullish(),
});

export const purchaseBody = z.object({
    planId: z.string().min(1, 'Plan ID is required'),
});
