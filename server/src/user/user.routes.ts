import express from 'express';
import { protect } from '@/shared/authMiddleware.js';
import { validate } from '@/shared/validate.js';
import { asyncHandler } from '@/shared/asyncHandler.js';
import { createProjectBody, purchaseBody } from '@/user/user.schema.js';
import {
    getUserCredits, createUserProject, getUserProject,
    getUserProjects, togglePublish, getPlans, getModels,
} from '@/user/user.controller.js';
import { purchaseCredits } from '@/billing/billing.controller.js';

const router = express.Router();

// Public catalogs.
router.get('/plans', asyncHandler(getPlans));
router.get('/models', asyncHandler(getModels));

// Authenticated.
router.get('/credits', protect, asyncHandler(getUserCredits));
router.post('/project', protect, validate({ body: createProjectBody }), asyncHandler(createUserProject));
router.get('/project/:projectId', protect, asyncHandler(getUserProject));
router.get('/projects', protect, asyncHandler(getUserProjects));
router.post('/publish-toggle/:projectId', protect, asyncHandler(togglePublish));
router.post('/purchase-credits', protect, validate({ body: purchaseBody }), asyncHandler(purchaseCredits));

export default router;
