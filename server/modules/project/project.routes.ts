import express from 'express';
import { protect } from '../../shared/middleware/auth.js';
import { genLimiter, writeLimiter } from '../../shared/middleware/rateLimiters.js';
import { validate } from '../../shared/http/validate.js';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { versionParams, revisionBody, editElementBody, saveBody } from './project.schema.js';
import {
    deleteProject, duplicateProject, getProjectById, getProjectPreview,
    getProjectThumbnail, getProjectVersion, getPublishedProjects,
} from './crud.controller.js';
import { cancelGeneration, regenerateProject, streamGeneration } from './generation.controller.js';
import { editElement, makeRevision, rollbackToVersion, saveProjectCode } from './revision.controller.js';

const router = express.Router();

// LLM / credit-charging endpoints (strict bucket).
router.post('/revision/:projectId', genLimiter, protect, validate({ body: revisionBody }), asyncHandler(makeRevision));
router.post('/edit-element/:projectId', genLimiter, protect, validate({ body: editElementBody }), asyncHandler(editElement));
router.post('/stream/:projectId', genLimiter, protect, streamGeneration); // SSE — owns its own responses
router.post('/regenerate/:projectId', genLimiter, protect, asyncHandler(regenerateProject));

// DB-writing endpoints (moderate bucket).
router.post('/cancel/:projectId', writeLimiter, protect, asyncHandler(cancelGeneration));
router.post('/duplicate/:projectId', writeLimiter, protect, asyncHandler(duplicateProject));
router.put('/save/:projectId', writeLimiter, protect, validate({ body: saveBody }), asyncHandler(saveProjectCode));
router.post('/rollback/:projectId/:versionId', writeLimiter, protect, validate({ params: versionParams }), asyncHandler(rollbackToVersion));
router.delete('/:projectId', writeLimiter, protect, asyncHandler(deleteProject));

// Reads.
router.get('/preview/:projectId', protect, asyncHandler(getProjectPreview));
router.get('/version/:projectId/:versionId', protect, asyncHandler(getProjectVersion));
router.get('/thumbnail/:projectId', protect, asyncHandler(getProjectThumbnail));
router.get('/published', asyncHandler(getPublishedProjects));
router.get('/published/:projectId', asyncHandler(getProjectById));

export default router;
