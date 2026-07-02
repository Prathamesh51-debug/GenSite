import { createChatCompletion, EDIT_MODEL } from '../../shared/lib/openai.js';
import { extractHtml, looksLikeHtml } from '../../shared/lib/html.js';
import { chargeCredits, refundCredits } from '../../shared/lib/credits.js';
import { storeHtml } from '../../shared/lib/storage.js';
import { CREDIT_COSTS } from '../../shared/config/constants.js';
import { ConflictError, InsufficientCreditsError, NotFoundError, UpstreamError, BadRequestError } from '../../shared/http/AppError.js';
import { projectRepository } from './project.repository.js';
import { editing, pruneVersions } from './project.runtime.js';

// Pick which page a chat revision edits: a page named in the message wins, else the
// page the user is viewing (`path`), else the home page. Single-page -> index.html.
const resolveRevisionTarget = (
    filesObj: Record<string, string> | null,
    requestedPath: string | undefined,
    message: string
): string => {
    if (!filesObj) return 'index.html';
    const paths = Object.keys(filesObj);
    if (paths.length === 0) return 'index.html';

    const stated = paths.find((p) => {
        const stem = p.replace(/\.html$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        if (!stem || stem === 'index') return false;
        return new RegExp(`\\b${stem}\\b`, 'i').test(message);
    });
    if (stated) return stated;

    if (requestedPath && paths.includes(requestedPath)) return requestedPath;
    return paths.includes('index.html') ? 'index.html' : paths[0];
};

export const revisionService = {
    // AI chat revision of a page (5 credits).
    async makeRevision(userId: string, projectId: string, message: string, path?: string) {
        let charged = false;
        let locked = false;
        try {
            const project = await projectRepository.findOwnedWithHistory(projectId, userId);
            if (!project) throw new NotFoundError('Project not found');

            if (editing.has(projectId)) {
                throw new ConflictError('A change is already being applied to this project — please wait.');
            }
            editing.add(projectId);
            locked = true;

            charged = await chargeCredits(userId, CREDIT_COSTS.revision);
            if (!charged) throw new InsufficientCreditsError('add more credits to make changes');

            await projectRepository.addMessage(projectId, 'user', message);

            const priorRequests = project.conversation
                .filter((c) => c.role === 'user')
                .slice(-5)
                .map((c) => c.content);
            const historyBlock = priorRequests.length
                ? `EARLIER REQUESTS THIS SESSION (oldest to newest):\n${priorRequests.map((r) => `- ${r}`).join('\n')}\n\n`
                : '';

            const filesObj = project.files && typeof project.files === 'object'
                ? (project.files as Record<string, string>)
                : null;
            const targetPath = resolveRevisionTarget(filesObj, path?.trim(), message);
            const sourceHtml = filesObj
                ? (filesObj[targetPath] ?? project.current_code ?? '')
                : (project.current_code ?? '');

            const response = await createChatCompletion({
                model: EDIT_MODEL,
                max_tokens: 12000,
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
- Keep the design premium and cohesive. When adding NEW images use real photos (https://picsum.photos/seed/KEYWORD/W/H) or avatars (https://i.pravatar.cc/150?img=N) — never gray placeholder boxes.

CRITICAL HARD RULES:
1. Put ALL output ONLY into the message content.
2. Do NOT use "reasoning", "analysis" or any hidden fields.
3. Do NOT include explanations, notes, comments or markdown code fences.
4. Output must start with <!DOCTYPE html> with nothing before or after the HTML.`
                    }, {
                        role: 'user',
                        content: `${historyBlock}CHANGE REQUEST:\n${message}\n\nYou are editing the "${targetPath}" page of the site. Apply the change across the WHOLE page where relevant, and keep the header/nav links to the other pages intact.\n\nCURRENT HTML:\n${sourceHtml}`
                    }
                ]
            });

            const generated = extractHtml(response.choices?.[0]?.message?.content);

            if (!looksLikeHtml(generated)) {
                // Refund and keep the current version rather than saving garbage.
                await refundCredits(userId, CREDIT_COSTS.revision);
                charged = false;
                await projectRepository.addMessage(projectId, 'assistant', "I couldn't apply that change reliably, so I kept your current version and refunded your credits. Try rephrasing the request a little more specifically.");
                throw new UpstreamError('The AI did not return a valid website — your credits were refunded.');
            }

            const updatedFiles = filesObj ? { ...filesObj, [targetPath]: generated } : undefined;
            const indexHtml = updatedFiles ? (updatedFiles['index.html'] ?? generated) : generated;
            const indexRef = await storeHtml(indexHtml, projectId);

            const version = await projectRepository.createVersion({
                code: indexRef, files: updatedFiles, description: message.slice(0, 60), projectId,
            });

            await projectRepository.addMessage(projectId, 'assistant', (filesObj && targetPath !== 'index.html')
                ? `I've updated the ${targetPath} page. You can preview it now.`
                : "I've made the changes to your website. You can preview it now.");

            await projectRepository.update(projectId, {
                current_code: indexRef,
                ...(updatedFiles ? { files: updatedFiles } : {}),
                current_version_index: version.id,
            });

            await pruneVersions(projectId).catch(() => {});
        } catch (err) {
            if (charged) await refundCredits(userId, CREDIT_COSTS.revision).catch(() => {});
            throw err;
        } finally {
            if (locked) editing.delete(projectId);
        }
    },

    // AI-edit a single selected element (2 credits). Returns the new element HTML;
    // the client splices it in and autosaves.
    async editElement(userId: string, projectId: string, html: string, message: string) {
        let charged = false;
        let locked = false;
        try {
            const project = await projectRepository.findOwned(projectId, userId);
            if (!project) throw new NotFoundError('Project not found');

            if (editing.has(projectId)) {
                throw new ConflictError('A change is already being applied to this project — please wait.');
            }
            editing.add(projectId);
            locked = true;

            charged = await chargeCredits(userId, CREDIT_COSTS.elementEdit);
            if (!charged) throw new InsufficientCreditsError('Add more credits to make changes');

            const response = await createChatCompletion({
                model: EDIT_MODEL,
                max_tokens: 4000,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert web developer. You are given ONE HTML element (a section or component) from a Tailwind CSS page, plus a change request. Apply the change and return ONLY the updated HTML for that SAME element.

RULES:
- Return ONLY the element's HTML. The root tag must be the SAME kind of element. No <html>, <head> or <body> wrapper.
- Use Tailwind utility classes for styling and animation (transition, duration-300, hover:*, animate-*).
- For any new images use real photos: https://picsum.photos/seed/KEYWORD/W/H (avatars: https://i.pravatar.cc/150?img=N). Never gray placeholders.
- Do NOT include explanations, comments, or markdown code fences. Output the HTML only.`
                    },
                    {
                        role: 'user',
                        content: `CHANGE REQUEST:\n${message}\n\nELEMENT HTML:\n${html}`
                    }
                ]
            });

            const newHtml = extractHtml(response.choices?.[0]?.message?.content);
            if (!newHtml || !/<[a-z][\s\S]*>/i.test(newHtml)) {
                await refundCredits(userId, CREDIT_COSTS.elementEdit);
                charged = false;
                throw new UpstreamError('Could not edit that element — credits refunded. Try rephrasing.');
            }

            return newHtml;
        } catch (err) {
            if (charged) await refundCredits(userId, CREDIT_COSTS.elementEdit).catch(() => {});
            throw err;
        } finally {
            if (locked) editing.delete(projectId);
        }
    },

    // Persist a manual editor save for one page (free — no LLM).
    async save(userId: string, projectId: string, code: string, path?: string) {
        let locked = false;
        try {
            const project = await projectRepository.findOwned(projectId, userId);
            if (!project) throw new NotFoundError('Project not found');

            const filePath = (typeof path === 'string' && path.trim()) ? path.trim() : 'index.html';
            const filesObj = (project.files && typeof project.files === 'object')
                ? (project.files as Record<string, string>)
                : null;

            if (filesObj && !(filePath in filesObj)) throw new BadRequestError('Unknown page.');

            const currentContent = filesObj ? (filesObj[filePath] ?? '') : (project.current_code ?? '');
            if (code === currentContent) return 'No changes to save';

            if (editing.has(projectId)) {
                throw new ConflictError('A change is already being applied — please retry.');
            }
            editing.add(projectId);
            locked = true;

            const updatedFiles = filesObj ? { ...filesObj, [filePath]: code } : undefined;
            const indexHtml = updatedFiles ? (updatedFiles['index.html'] ?? code) : code;
            const indexRef = await storeHtml(indexHtml, projectId);

            const version = await projectRepository.createVersion({
                code: indexRef,
                files: updatedFiles,
                description: filePath === 'index.html' ? 'Manual edit' : `Edited ${filePath}`,
                projectId,
            });

            await projectRepository.update(projectId, {
                current_code: indexRef,
                ...(updatedFiles ? { files: updatedFiles } : {}),
                current_version_index: version.id,
            });

            await pruneVersions(projectId).catch(() => {});
            return 'Project saved successfully';
        } finally {
            if (locked) editing.delete(projectId);
        }
    },

    // Roll the live site back to a previous version.
    async rollback(userId: string, projectId: string, versionId: string) {
        const owned = await projectRepository.findOwnedId(projectId, userId);
        if (!owned) throw new NotFoundError('Project not found');

        const version = await projectRepository.findVersion(versionId, projectId);
        if (!version) throw new NotFoundError('Version not found');

        await projectRepository.update(projectId, {
            current_code: version.code,
            files: (version.files ?? undefined) as any,
            current_version_index: version.id,
        });

        await projectRepository.addMessage(projectId, 'assistant', "I've rolled back your website to selected version. You can now preview it");
    },
};
