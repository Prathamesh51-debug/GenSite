import { createChatCompletion } from '@/generation/llm.js';
import { editModel } from '@/generation/models.js';
import { extractHtml, looksLikeHtml, tagSectionsIfMissing } from '@/core/html.js';
import { parseEditSummary, stripEditSummary, describeChanges, formatEditHistory } from '@/core/editSummary.js';
import { measureContentDrift, looksLikeDifferentSite } from '@/core/contentDrift.js';
import { chargeCredits, freeCapReached, refundCharge, settleCharge } from '@/core/credits.js';
import { CREDIT_COSTS } from '@/shared/constants.js';
import { AppError, BadRequestError, ConflictError, InsufficientCreditsError, NotFoundError, UpstreamError } from '@/shared/AppError.js';
import { projectRepository } from '@/project/project.repository.js';
import { pruneVersions, acquireProjectLock, releaseProjectLock, LOCK_TTL } from '@/project/project.runtime.js';
import { enhanceImages } from '@/generation/images.js';
import { buildRevisionMessages, buildElementEditMessages } from '@/generation/prompts.js';

class FreeCapError extends AppError {
    constructor() { super(429, 'Free AI capacity is used up for today. Please try again tomorrow or add credits.'); }
}

class NewSiteRequestError extends AppError {
    constructor() { super(422, 'That looks like a new website — start a new project for it. Your credits were refunded.'); }
}

const refuseNewSite = async (projectId: string, chargeId: string): Promise<never> => {
    await refundCharge(chargeId);
    await projectRepository.addMessage(projectId, 'assistant', "That sounds like a brand-new website rather than a change to this one, so I left your site as it is and refunded your credits. Start a new project from your dashboard to build it.");
    throw new NewSiteRequestError();
};

export const revisionService = {
    // AI chat revision of a page (5 credits).
    async makeRevision(userId: string, projectId: string, message: string) {
        let chargeId: string | null = null;
        let lockToken: string | null = null;
        try {
            const owned = await projectRepository.findOwnedId(projectId, userId);
            if (!owned) throw new NotFoundError('Project not found');

            lockToken = await acquireProjectLock(projectId, userId, LOCK_TTL.edit);
            if (!lockToken) throw new ConflictError('A change is already being applied to this project — please wait.');

            const project = await projectRepository.findOwnedWithHistory(projectId, userId);
            if (!project) throw new NotFoundError('Project not found');

            if (await freeCapReached(userId)) throw new FreeCapError();
            chargeId = await chargeCredits(userId, CREDIT_COSTS.revision, 'revision');
            if (!chargeId) throw new InsufficientCreditsError('add more credits to make changes');

            await projectRepository.addMessage(projectId, 'user', message);

            const historyBlock = formatEditHistory(project.conversation);

            const sourceHtml = project.current_code ?? '';

            const response = await createChatCompletion({
                model: editModel(project.model),
                max_tokens: 24000,
                messages: buildRevisionMessages(historyBlock, message, sourceHtml),
            });

            const raw = response.choices?.[0]?.message?.content;
            const summary = parseEditSummary(raw);

            if (summary.intent === 'new-site') await refuseNewSite(projectId, chargeId);

            const generated = stripEditSummary(extractHtml(raw));
            const truncated = response.choices?.[0]?.finish_reason === 'length';

            if (!looksLikeHtml(generated) || truncated) {
                await refundCharge(chargeId);
                await projectRepository.addMessage(projectId, 'assistant', "I couldn't apply that change reliably, so I kept your current version and refunded your credits. Try rephrasing the request a little more specifically.");
                throw new UpstreamError('The AI did not return a valid website — your credits were refunded.');
            }

            let enhanced = await enhanceImages(generated).catch(() => generated);
            enhanced = tagSectionsIfMissing(enhanced);

            const drift = measureContentDrift(sourceHtml, enhanced);
            console.log(`[edit] ${JSON.stringify({ projectId, tier: project.model ?? 'free', model: response?.model ?? null, changes: summary.changes.length, ...drift })}`);
            if (looksLikeDifferentSite(drift)) await refuseNewSite(projectId, chargeId);

            const version = await projectRepository.createVersion({
                code: enhanced, description: message.slice(0, 60), projectId,
            });

            await projectRepository.addMessage(projectId, 'assistant', describeChanges(summary.changes));

            await projectRepository.update(projectId, {
                current_code: enhanced,
                current_version_index: version.id,
            });

            await settleCharge(chargeId).catch(() => {});
            await pruneVersions(projectId).catch(() => {});
        } catch (err) {
            if (chargeId) await refundCharge(chargeId).catch(() => {});
            throw err;
        } finally {
            if (lockToken) await releaseProjectLock(projectId, lockToken).catch(() => {});
        }
    },

    // AI-edit a single selected element (2 credits). Returns the new element HTML;
    // the client splices it in and autosaves.
    async editElement(userId: string, projectId: string, html: string, message: string) {
        let chargeId: string | null = null;
        let lockToken: string | null = null;
        try {
            const project = await projectRepository.findOwned(projectId, userId);
            if (!project) throw new NotFoundError('Project not found');

            const pageSize = project.current_code?.length ?? 0;
            if (pageSize && html.length > pageSize * 0.6) {
                throw new BadRequestError('That selection covers most of the page — select a smaller section, or use the chat for page-wide changes.');
            }

            lockToken = await acquireProjectLock(projectId, userId, LOCK_TTL.edit);
            if (!lockToken) throw new ConflictError('A change is already being applied to this project — please wait.');

            if (await freeCapReached(userId)) throw new FreeCapError();
            chargeId = await chargeCredits(userId, CREDIT_COSTS.elementEdit, 'elementEdit');
            if (!chargeId) throw new InsufficientCreditsError('Add more credits to make changes');

            const response = await createChatCompletion({
                model: editModel(project.model),
                max_tokens: 6000,
                messages: buildElementEditMessages(message, html),
            });

            const newHtml = extractHtml(response.choices?.[0]?.message?.content);
            const truncated = response.choices?.[0]?.finish_reason === 'length';
            if (!newHtml || truncated || !/<[a-z][\s\S]*>/i.test(newHtml)) {
                await refundCharge(chargeId);
                throw new UpstreamError('Could not edit that element — credits refunded. Try rephrasing.');
            }

            const enhanced = tagSectionsIfMissing(await enhanceImages(newHtml).catch(() => newHtml));
            await settleCharge(chargeId).catch(() => {});
            return enhanced;
        } catch (err) {
            if (chargeId) await refundCharge(chargeId).catch(() => {});
            throw err;
        } finally {
            if (lockToken) await releaseProjectLock(projectId, lockToken).catch(() => {});
        }
    },

    // Persist a manual editor save (free — no LLM).
    async save(userId: string, projectId: string, code: string) {
        let lockToken: string | null = null;
        try {
            const project = await projectRepository.findOwned(projectId, userId);
            if (!project) throw new NotFoundError('Project not found');

            if (code === (project.current_code ?? '')) return 'No changes to save';

            lockToken = await acquireProjectLock(projectId, userId, LOCK_TTL.edit);
            if (!lockToken) throw new ConflictError('A change is already being applied — please retry.');

            const version = await projectRepository.createVersion({
                code,
                description: 'Manual edit',
                projectId,
            });

            await projectRepository.update(projectId, {
                current_code: code,
                current_version_index: version.id,
            });

            await pruneVersions(projectId).catch(() => {});
            return 'Project saved successfully';
        } finally {
            if (lockToken) await releaseProjectLock(projectId, lockToken).catch(() => {});
        }
    },

    // Roll the live site back to a previous version.
    async rollback(userId: string, projectId: string, versionId: string) {
        const owned = await projectRepository.findOwnedId(projectId, userId);
        if (!owned) throw new NotFoundError('Project not found');

        const version = await projectRepository.findVersion(versionId, projectId);
        if (!version) throw new NotFoundError('Version not found');

        const lockToken = await acquireProjectLock(projectId, userId, LOCK_TTL.edit);
        if (!lockToken) throw new ConflictError('A change is already being applied — please wait, then roll back.');
        try {
            await projectRepository.update(projectId, {
                current_code: version.code,
                current_version_index: version.id,
            });
            await projectRepository.addMessage(projectId, 'assistant', "I've rolled back your website to selected version. You can now preview it");
        } finally {
            await releaseProjectLock(projectId, lockToken).catch(() => {});
        }
    },
};
