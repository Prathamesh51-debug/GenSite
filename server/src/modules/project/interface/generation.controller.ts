import type { Request, Response } from 'express';
import { chargeCredits, refundCredits } from '@/core/credits.js';
import { storeHtml } from '@/platform/storage/storage.js';
import { generateSite } from '@/generation/orchestrator/generate.js';
import { CREDIT_COSTS } from '@/shared/config/constants.js';
import { generationCost } from '@/generation/providers/models.js';
import { projectRepository } from '@/modules/project/data/project.repository.js';
import { generating, pruneVersions } from '@/modules/project/domain/project.runtime.js';
import { generationService } from '@/modules/project/application/generation.service.js';

export const streamGeneration = async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { projectId } = req.params as { projectId: string };
    let charged = false;

    let cost: number = CREDIT_COSTS.generate;

    let owns = false;

    let finished = false;
    const abort = new AbortController();
    req.on('close', () => { if (!finished) abort.abort(); });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    (res as any).flushHeaders?.();

    const send = (obj: any) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    try {
        const project = await projectRepository.findOwned(projectId, userId);
        if (!project) { send({ type: 'error', message: 'Project not found' }); return res.end(); }

        if (project.current_code) { send({ type: 'done', html: project.current_code }); return res.end(); }

        if (generating.has(projectId)) {
            send({ type: 'error', message: 'This site is already being generated — please wait a moment.' });
            return res.end();
        }
        generating.set(projectId, abort);
        owns = true;

        cost = generationCost(project.model);

        charged = await chargeCredits(userId, cost);
        if (!charged) {
            send({ type: 'error', message: `You need at least ${cost} credits to generate. Please add more.` });
            return res.end();
        }

        const result = await generateSite(project.initial_prompt, {
            signal: abort.signal,
            onProgress: (message) => { try { send({ type: 'progress', message }); } catch {} },
            model: project.model,
        });

        if (!result) {
            if (charged) { await refundCredits(userId, cost).catch(() => {}); charged = false; }
            await projectRepository.addMessage(projectId, 'assistant', "I couldn't generate your website this time and refunded your credits. Please try again, ideally with a bit more detail.");
            send({ type: 'error', message: 'Generation failed — credits refunded.' });
            return res.end();
        }

        const { files, index } = result;

        if (result.downgraded && cost > CREDIT_COSTS.generate) {
            const surcharge = cost - CREDIT_COSTS.generate;
            await refundCredits(userId, surcharge).catch(() => {});
            cost = CREDIT_COSTS.generate;
            send({ type: 'progress', message: `Our premium model was briefly unavailable, so your site was built with a standard model — we've refunded ${surcharge} credits.` });
        }

        const indexRef = await storeHtml(index, projectId);
        const pageCount = Object.keys(files).length;

        const priorVersions = await projectRepository.countVersions(projectId);
        const version = await projectRepository.createVersion({ code: indexRef, files, description: 'Initial version', projectId });
        await projectRepository.addMessage(projectId, 'assistant', `I've created your ${pageCount}-page website! You can preview it and request any changes.`);
        await projectRepository.update(projectId, { current_code: indexRef, files, current_version_index: version.id });
        if (priorVersions === 0) {
            await projectRepository.incrementCreation(userId).catch(() => {});
        }
        await pruneVersions(projectId).catch(() => {});

        finished = true;
        send({ type: 'done', html: index });
        res.end();
    } catch (error: any) {
        if (charged) { await refundCredits(userId, cost).catch(() => {}); charged = false; }
        console.error('stream error:', error?.message);
        try { send({ type: 'error', message: 'Generation failed. Please try again.' }); } catch {}
        res.end();
    } finally {
        if (owns) generating.delete(projectId);
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
