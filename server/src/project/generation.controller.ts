import type { Request, Response } from 'express';
import { chargeCredits, freeCapReached, refundCharge, settleCharge } from '@/core/credits.js';
import { generateSite } from '@/generation/generate.js';
import { CREDIT_COSTS } from '@/shared/constants.js';
import { generationCost } from '@/generation/models.js';
import { projectRepository } from '@/project/project.repository.js';
import {
    generating, pruneVersions, acquireProjectLock, releaseProjectLock, LOCK_TTL,
} from '@/project/project.runtime.js';
import { generationService } from '@/project/generation.service.js';
import { log } from '@/platform/log.js';
import { reportError, startAction, endAction } from '@/platform/observability.js';

const streamPreview = process.env.STREAM_PREVIEW === 'true';

export const streamGeneration = async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { projectId } = req.params as { projectId: string };
    let chargeId: string | null = null;
    let lockToken: string | null = null;
    let finished = false;
    let outcome = 'error';

    const abort = new AbortController();
    req.on('close', () => { if (!finished) abort.abort(); });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    (res as any).flushHeaders?.();

    const send = (obj: any) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    try {
        const existing = await projectRepository.findOwned(projectId, userId);
        if (!existing) { send({ type: 'error', message: 'Project not found' }); return res.end(); }
        if (existing.current_code) { send({ type: 'done', html: existing.current_code }); return res.end(); }

        lockToken = await acquireProjectLock(projectId, userId, LOCK_TTL.generation);
        if (!lockToken) {
            send({ type: 'error', message: 'This site is already being generated — please wait a moment.' });
            return res.end();
        }

        const project = await projectRepository.findOwned(projectId, userId);
        if (!project) { send({ type: 'error', message: 'Project not found' }); return res.end(); }
        if (project.current_code) { send({ type: 'done', html: project.current_code }); return res.end(); }

        generating.set(projectId, abort);
        startAction('generate', { userId, projectId, tier: project.model });

        if (await freeCapReached(userId)) {
            outcome = 'free_cap_reached';
            send({ type: 'error', message: 'Free generation capacity is used up for today. Please try again tomorrow or add credits.' });
            return res.end();
        }

        const cost = generationCost(project.model);
        chargeId = await chargeCredits(userId, cost, 'generate');
        if (!chargeId) {
            outcome = 'insufficient_credits';
            send({ type: 'error', message: `You need at least ${cost} credits to generate. Please add more.` });
            return res.end();
        }

        const result = await generateSite(project.initial_prompt, {
            signal: abort.signal,
            onProgress: (message) => { try { send({ type: 'progress', message }); } catch {} },
            onChunk: streamPreview ? (html) => { try { send({ type: 'chunk', html }); } catch {} } : undefined,
            model: project.model,
        });

        if (!result) {
            outcome = 'failed_refunded';
            await refundCharge(chargeId).catch(() => {});
            chargeId = null;
            await projectRepository.addMessage(projectId, 'assistant', "I couldn't generate your website this time and refunded your credits. Please try again, ideally with a bit more detail.");
            send({ type: 'error', message: 'Generation failed — credits refunded.' });
            return res.end();
        }

        const { html } = result;
        const surcharge = result.downgraded && cost > CREDIT_COSTS.generate ? cost - CREDIT_COSTS.generate : 0;
        if (surcharge) {
            send({ type: 'progress', message: `Our premium model was briefly unavailable, so your site was built with a standard model — we've refunded ${surcharge} credits.` });
        }


        const priorVersions = await projectRepository.countVersions(projectId);
        const version = await projectRepository.createVersion({ code: html, description: 'Initial version', projectId });
        await projectRepository.addMessage(projectId, 'assistant', "I've created your website! You can preview it and request any changes.");
        await projectRepository.update(projectId, { current_code: html, current_version_index: version.id });
        await settleCharge(chargeId, surcharge).catch(() => {});
        chargeId = null;
        if (priorVersions === 0) {
            await projectRepository.incrementCreation(userId).catch(() => {});
        }
        await pruneVersions(projectId).catch(() => {});

        finished = true;
        outcome = surcharge ? 'done_downgraded' : 'done';
        send({ type: 'done', html });
        res.end();
    } catch (error: any) {
        if (chargeId) await refundCharge(chargeId).catch(() => {});
        outcome = abort.signal.aborted ? 'cancelled' : 'error';
        log('generation_failed', { projectId, message: error?.message }, 'error');
        if (!abort.signal.aborted) reportError(error, { projectId });
        try { send({ type: 'error', message: 'Generation failed. Please try again.' }); } catch {}
        res.end();
    } finally {
        endAction(outcome);
        if (lockToken) {
            if (generating.get(projectId) === abort) generating.delete(projectId);
            await releaseProjectLock(projectId, lockToken).catch(() => {});
        }
    }
};

export const cancelGeneration = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    await generationService.cancel(req.userId!, projectId);
    res.json({ ok: true });
};

export const regenerateProject = async (req: Request, res: Response) => {
    const { projectId } = req.params as { projectId: string };
    await generationService.regenerate(req.userId!, projectId);
    res.json({ ok: true });
};
