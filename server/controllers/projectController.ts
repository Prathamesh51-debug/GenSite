import {Request, Response} from 'express'
import prisma from '../lib/prisma.js';
import openai, { createChatCompletion, EDIT_MODEL, FREE_MODEL } from '../configs/openai.js';
import { extractHtml, looksLikeHtml } from '../lib/html.js';
import { DESIGN_GUIDE } from '../lib/prompts.js';

// controller function to make revision
export const makeRevision = async (req: Request, res: Response) => {
    const userId = req.userId;

    try {
        const {projectId} = req.params as { projectId: string };
        const {message} = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!userId || !user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if(user.credits < 5){
            return res.status(403).json({ message: 'add more credits to make changes' });
        }

        if(!message || typeof message !== 'string' || message.trim() === ''){
            return res.status(400).json({ message: 'Please enter a valid prompt' });
        }

        const currentProject = await prisma.websiteProject.findUnique({
            where: {id: projectId, userId},
            include: {versions: true, conversation: { orderBy: { timestamp: 'asc' } }}
        })

        if(!currentProject){
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: message,
                projectId
            }
        })

        // Use transaction to ensure atomic credit deduction
        await prisma.$transaction([
            prisma.user.update({
                where : {id: userId},
                data: {credits: {decrement:5}}
            })
        ])

        // Give the model the user's earlier requests this session so iterative
        // edits ("make it bigger", "now the footer too") have context.
        const priorRequests = currentProject.conversation
            .filter((c) => c.role === 'user')
            .slice(-5)
            .map((c) => c.content);
        const historyBlock = priorRequests.length
            ? `EARLIER REQUESTS THIS SESSION (oldest to newest):\n${priorRequests.map((r) => `- ${r}`).join('\n')}\n\n`
            : '';

        // Generate the updated code. The user's request is passed verbatim (the
        // previous "enhancement" rewrite distorted intent), together with the
        // current HTML in clearly delimited sections — never quote-wrapped, since
        // HTML is full of quotes and that confused the model.
        const codeGenerationResponse = await createChatCompletion({
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
                },{
                     role: 'user',
                     content: `${historyBlock}CHANGE REQUEST:\n${message}\n\nApply this across the WHOLE page where relevant.\n\nCURRENT HTML:\n${currentProject.current_code}`
                }
            ]
        })

        const generated = extractHtml(codeGenerationResponse.choices?.[0]?.message?.content);

        if (!looksLikeHtml(generated)) {
            // Refund and keep the current version rather than saving garbage.
            await prisma.user.update({
                where : {id: userId},
                data: {credits: {increment:5}}
            })
            await prisma.conversation.create({
                data: {
                    role: 'assistant',
                    content: "I couldn't apply that change reliably, so I kept your current version and refunded your credits. Try rephrasing the request a little more specifically.",
                    projectId
                }
            })
            return res.status(502).json({ message: 'The AI did not return a valid website — your credits were refunded.' });
        }

        const version = await prisma.version.create({
            data: {
                code: generated,
                description: message.slice(0, 60),
                projectId
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've made the changes to your website. You can preview it now.",
                projectId
            }
        })

        await prisma.websiteProject.update({
            where : {id: projectId},
            data: {
                current_code: generated,
                current_version_index: version.id
            }
        })

        res.json({ message: 'Changes made successfully' })

    } catch (error: any) {
        await prisma.user.update({
            where : {id: userId},
            data: {credits: {increment:5}}
        })
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });

    }
}

// controller function to roll back to previous version
export const rollbackToVersion = async (req: Request, res: Response) => {
    

    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized'});
        }
        const { projectId, versionId } = req.params as { projectId: string; versionId: string };

        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId, userId},
            include: {versions: true}
        })

        if(!project){
            return res.status(404).json({ message: 'Project not found'});
        }

        const version = project.versions.find((version)=>version.id === versionId);

        if(!version){
            return res.status(404).json({ message: 'Version not found'})
        }

        await prisma.websiteProject.update({
            where: {id: projectId, userId},
            data: {
                current_code: version.code,
                current_version_index: version.id
            }
        })


        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've rolled back your website to selected version. You can now preview it",
                projectId
            }
        })

        res.json({message: 'Version rolled back'});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
    
}

// controller function to delete a project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { projectId } = req.params as { projectId: string };
        
        if (!projectId) {
            return res.status(400).json({ message: 'Project ID is required' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId, userId}
        })

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Actually delete the project (cascade will handle related records)
        await prisma.websiteProject.delete({
            where: {id: projectId, userId}
        })

        res.json({message: 'Project deleted successfully'});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
    
}

//controller for getting project code for preview
export const getProjectPreview = async (req: Request, res: Response) => {
    

    try {
        const userId = req.userId;
        const { projectId } = req.params as { projectId: string };
        
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }
        

        const project = await prisma.websiteProject.findFirst({
            where: {id: projectId, userId},
            include: {versions: true}
        })

        if(!project){
            return res.status(404).json({ message: 'Project not found' });
        }



        res.json({project});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
    
}

// get published project

export const getPublishedProjects = async (req: Request, res: Response) => {
    
    try {

        const projects = await prisma.websiteProject.findMany({
            where: {isPublished: true},
            include: {user: true}
        })

        res.json({projects});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
    
}

// get a single project by id
export const getProjectById = async (req: Request, res: Response) => {
    
    try {
        const {projectId} = req.params as { projectId: string };
        

        const project = await prisma.websiteProject.findFirst({
            where: {id: projectId},
        })

        if(!project || project.isPublished === false || !project?.current_code){
            return res.status(404).json({ message: 'Project not found' });
        }



        res.json({code : project.current_code});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
    
}


//controller to save project
export const saveProjectCode= async (req: Request, res: Response) => {
    
    try {
        const userId = req.userId;
        const {projectId} = req.params as { projectId: string };
        const {code} = req.body;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if(!code){
            return res.status(400).json({ message: 'Code is required' });
        }
        

        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId, userId}
        })

        if(!project ){
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.websiteProject.update({
            where: {id: projectId},
            data: {current_code: code,current_version_index: ''}
        })



        res.json({message: 'Project saved successfully'});
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }

}

// AI-edit a single selected element/section. Much cheaper + faster than a full
// page regeneration because only that element's HTML is sent and returned.
export const editElement = async (req: Request, res: Response) => {
    const userId = req.userId;
    try {
        const { projectId } = req.params as { projectId: string };
        const { html, message } = req.body as { html?: string; message?: string };

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!userId || !user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (user.credits < 2) {
            return res.status(403).json({ message: 'Add more credits to make changes' });
        }
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ message: 'Please enter a valid prompt' });
        }
        if (!html || typeof html !== 'string') {
            return res.status(400).json({ message: 'No element selected' });
        }

        const project = await prisma.websiteProject.findUnique({ where: { id: projectId, userId } });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: 2 } } });

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
            await prisma.user.update({ where: { id: userId }, data: { credits: { increment: 2 } } });
            return res.status(502).json({ message: 'Could not edit that element — credits refunded. Try rephrasing.' });
        }

        res.json({ html: newHtml });
    } catch (error: any) {
        try { await prisma.user.update({ where: { id: userId }, data: { credits: { increment: 2 } } }); } catch {}
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Stream the initial website generation over Server-Sent Events so the editor
// can render the site as it builds, instead of waiting on a blank loader.
export const streamGeneration = async (req: Request, res: Response) => {
    const userId = req.userId;
    const { projectId } = req.params as { projectId: string };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    (res as any).flushHeaders?.();

    const send = (obj: any) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    try {
        const project = await prisma.websiteProject.findUnique({ where: { id: projectId, userId } });
        if (!project) { send({ type: 'error', message: 'Project not found' }); return res.end(); }

        // Already generated (e.g. a reconnect) — just finish, don't regenerate or recharge.
        if (project.current_code) { send({ type: 'done', html: project.current_code }); return res.end(); }

        const stream: any = await openai.chat.completions.create({
            model: FREE_MODEL,
            max_tokens: 12000,
            stream: true,
            messages: [
                {
                    role: 'system',
                    content: `You are an expert web developer. Create a complete, production-ready, single-page website based on this request: "${project.initial_prompt}"

Build a FULL multi-section site appropriate to the request — even if the request is brief — with a header/nav, hero, several content sections, and a footer.

CRITICAL REQUIREMENTS:
- Output valid HTML ONLY.
- Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
- Use Tailwind utility classes for all styling, animation and responsiveness.

${DESIGN_GUIDE}

CRITICAL HARD RULES:
1. Put ALL output ONLY into the message content. Do NOT use "reasoning"/"analysis" or any hidden fields.
2. Do NOT include explanations, notes, comments or markdown code fences.
3. Output must start with <!DOCTYPE html> with nothing before or after the HTML.`
                },
                { role: 'user', content: project.initial_prompt }
            ]
        });

        let full = '';
        let last = 0;
        for await (const chunk of stream) {
            const delta = chunk?.choices?.[0]?.delta?.content || '';
            if (!delta) continue;
            full += delta;
            const now = Date.now();
            if (now - last > 1200) {
                send({ type: 'chunk', html: full });
                last = now;
            }
            // The document is complete — stop now instead of waiting for the model's
            // trailing tokens (which can add 60s+ of dead "building" time).
            if (full.includes('</html>')) break;
        }

        const generated = extractHtml(full);
        if (!looksLikeHtml(generated)) {
            await prisma.user.update({ where: { id: userId }, data: { credits: { increment: 5 } } }).catch(() => {});
            await prisma.conversation.create({ data: { role: 'assistant', content: "I couldn't generate your website this time and refunded your credits. Please try again, ideally with a bit more detail.", projectId } });
            send({ type: 'error', message: 'Generation failed — credits refunded.' });
            return res.end();
        }

        const version = await prisma.version.create({ data: { code: generated, description: 'Initial version', projectId } });
        await prisma.conversation.create({ data: { role: 'assistant', content: "I've created your website! You can now preview it and request any changes.", projectId } });
        await prisma.websiteProject.update({ where: { id: projectId }, data: { current_code: generated, current_version_index: version.id } });

        send({ type: 'done', html: generated });
        res.end();
    } catch (error: any) {
        await prisma.user.update({ where: { id: userId }, data: { credits: { increment: 5 } } }).catch(() => {});
        console.log('stream error:', error?.message);
        try { send({ type: 'error', message: error?.message || 'Generation error' }); } catch {}
        res.end();
    }
}
