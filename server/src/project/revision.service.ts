import { createChatCompletion, EDIT_MODEL } from '@/generation/llm.js';
import { extractHtml, looksLikeHtml, tagSectionsIfMissing } from '@/core/html.js';
import { chargeCredits, freeCapReached, refundCharge, settleCharge } from '@/core/credits.js';
import { CREDIT_COSTS } from '@/shared/constants.js';
import { AppError, ConflictError, InsufficientCreditsError, NotFoundError, UpstreamError } from '@/shared/AppError.js';
import { projectRepository } from '@/project/project.repository.js';
import { pruneVersions, acquireProjectLock, releaseProjectLock, LOCK_TTL } from '@/project/project.runtime.js';
import { enhanceImages } from '@/generation/images.js';
import { EDIT_IMAGE_RULES } from '@/generation/prompts.js';

class FreeCapError extends AppError {
    constructor() { super(429, 'Free AI capacity is used up for today. Please try again tomorrow or add credits.'); }
}

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

            const priorRequests = project.conversation
                .filter((c) => c.role === 'user')
                .slice(-5)
                .map((c) => c.content);
            const historyBlock = priorRequests.length
                ? `EARLIER REQUESTS THIS SESSION (oldest to newest):\n${priorRequests.map((r) => `- ${r}`).join('\n')}\n\n`
                : '';

            const sourceHtml = project.current_code ?? '';

            const response = await createChatCompletion({
                model: EDIT_MODEL,
                max_tokens: 16000,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert web developer editing an existing single-page website. You are given the CURRENT HTML and a CHANGE REQUEST.

HOW TO APPLY THE CHANGE:
- If the request is GLOBAL or stylistic (e.g. "add animations", "change the colors", "make it modern", "improve spacing", "use a new font"), apply it CONSISTENTLY across the ENTIRE page — every relevant section (hero, features, pricing, testimonials, footer, etc.), NOT just the first/hero section.
- If the request clearly targets ONE specific element or section, change only that part.
- Either way, return the COMPLETE updated document and preserve the content/structure you are not changing.

CRITICAL REQUIREMENTS:
- Return the COMPLETE, updated HTML document (not a fragment, not a diff, not an explanation).
- The document MUST keep this exact script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
- Use Tailwind utility classes for all styling (no custom <style> CSS). For animation use Tailwind utilities (animate-*, transition-*, duration-*, hover:*, group-hover:*) on the relevant elements throughout the page.
- Keep the design premium and cohesive.

${EDIT_IMAGE_RULES}

CRITICAL HARD RULES:
1. Put ALL output ONLY into the message content.
2. Do NOT use "reasoning", "analysis" or any hidden fields.
3. Do NOT include explanations, notes, comments or markdown code fences.
4. Output must start with <!DOCTYPE html> with nothing before or after the HTML.`
                    }, {
                        role: 'user',
                        content: `${historyBlock}CHANGE REQUEST:\n${message}\n\nThis is a single-page site. Apply the change across the WHOLE page where relevant, and keep the in-page section navigation (nav anchor links to #section-ids) working.\n\nCURRENT HTML:\n${sourceHtml}`
                    }
                ]
            });

            const generated = extractHtml(response.choices?.[0]?.message?.content);
            const truncated = response.choices?.[0]?.finish_reason === 'length';

            if (!looksLikeHtml(generated) || truncated) {
                await refundCharge(chargeId);
                await projectRepository.addMessage(projectId, 'assistant', "I couldn't apply that change reliably, so I kept your current version and refunded your credits. Try rephrasing the request a little more specifically.");
                throw new UpstreamError('The AI did not return a valid website — your credits were refunded.');
            }

            let enhanced = await enhanceImages(generated).catch(() => generated);
            enhanced = tagSectionsIfMissing(enhanced);

            const version = await projectRepository.createVersion({
                code: enhanced, description: message.slice(0, 60), projectId,
            });

            await projectRepository.addMessage(projectId, 'assistant', "I've made the changes to your website. You can preview it now.");

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
            const owned = await projectRepository.findOwnedId(projectId, userId);
            if (!owned) throw new NotFoundError('Project not found');

            lockToken = await acquireProjectLock(projectId, userId, LOCK_TTL.edit);
            if (!lockToken) throw new ConflictError('A change is already being applied to this project — please wait.');

            if (await freeCapReached(userId)) throw new FreeCapError();
            chargeId = await chargeCredits(userId, CREDIT_COSTS.elementEdit, 'elementEdit');
            if (!chargeId) throw new InsufficientCreditsError('Add more credits to make changes');

            const response = await createChatCompletion({
                model: EDIT_MODEL,
                max_tokens: 6000,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert web developer. You are given ONE HTML element (a section or component) from a Tailwind CSS page, plus a change request. Apply the change and return ONLY the updated HTML for that SAME element.

RULES:
- Return ONLY the element's HTML. The root tag must be the SAME kind of element. No <html>, <head> or <body> wrapper.
- Use Tailwind utility classes for styling and animation (transition, duration-300, hover:*, animate-*).
- Do NOT include explanations, comments, or markdown code fences. Output the HTML only.

${EDIT_IMAGE_RULES}`
                    },
                    {
                        role: 'user',
                        content: `CHANGE REQUEST:\n${message}\n\nELEMENT HTML:\n${html}`
                    }
                ]
            });

            const newHtml = extractHtml(response.choices?.[0]?.message?.content);
            if (!newHtml || !/<[a-z][\s\S]*>/i.test(newHtml)) {
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
