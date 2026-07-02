import type { Request, Response } from 'express';
import { chargeCredits, refundCredits } from '../../shared/lib/credits.js';
import { storeHtml } from '../../shared/lib/storage.js';
import { generateSite } from '../../shared/lib/generate.js';
import { CREDIT_COSTS } from '../../shared/config/constants.js';
import { projectRepository } from './project.repository.js';
import { generating, pruneVersions } from './project.runtime.js';
import { generationService } from './generation.service.js';

// Stream the initial site generation over SSE so the editor renders as it builds.
// This handler owns its own response + error framing (it can't defer to the error
// middleware once the stream is open), so it isn't wrapped in asyncHandler.
export const streamGeneration = async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { projectId } = req.params as { projectId: string };
    let charged = false;
    // True only if THIS request owns the in-flight slot, so an early return never
    // evicts another live generation's controller.
    let owns = false;
    // Set once persisted, so the close handler only aborts genuinely in-flight work
    // (close also fires on normal completion after res.end()).
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

        // Already generated (e.g. a reconnect) — finish without regenerating or recharging.
        if (project.current_code) { send({ type: 'done', html: project.current_code }); return res.end(); }

        if (generating.has(projectId)) {
            send({ type: 'error', message: 'This site is already being generated — please wait a moment.' });
            return res.end();
        }
        generating.set(projectId, abort);
        owns = true;

        // Authoritative charge happens HERE (not at project creation) so a failed+refunded
        // build the user refreshes is re-charged, not re-run for free.
        charged = await chargeCredits(userId, CREDIT_COSTS.generate);
        if (!charged) {
            send({ type: 'error', message: 'You need at least 5 credits to generate. Please add more.' });
            return res.end();
        }

        const result = await generateSite(project.initial_prompt, {
            signal: abort.signal,
            onProgress: (message) => { try { send({ type: 'progress', message }); } catch {} },
            model: project.model,
        });

        if (!result) {
            if (charged) { await refundCredits(userId, CREDIT_COSTS.generate).catch(() => {}); charged = false; }
            await projectRepository.addMessage(projectId, 'assistant', "I couldn't generate your website this time and refunded your credits. Please try again, ideally with a bit more detail.");
            send({ type: 'error', message: 'Generation failed — credits refunded.' });
            return res.end();
        }

        const { files, index } = result;
        const indexRef = await storeHtml(index, projectId);
        const pageCount = Object.keys(files).length;
        // First successful build = no prior versions; only these count toward totalCreation.
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
        if (charged) { await refundCredits(userId, CREDIT_COSTS.generate).catch(() => {}); charged = false; }
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
