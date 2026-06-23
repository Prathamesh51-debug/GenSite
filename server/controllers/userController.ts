import { Request, Response } from 'express'
import prisma from '../lib/prisma.js';
import Stripe from 'stripe';

// Helper to safely get a string from req.params
const getStringParam = (param: string | string[] | undefined): string | undefined => {
    if (!param) return undefined;
    if (Array.isArray(param)) return param[0];
    return param;
}

export const getUserCredits = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Default to 50 credits (schema default) if credits is null/undefined
        const credits = user.credits ?? 50;

        res.json({ credits })

    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });

    }
}

export const createUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
    try {
        const { initial_prompt } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!initial_prompt || typeof initial_prompt !== 'string' || initial_prompt.trim() === '') {
            return res.status(400).json({ message: 'Initial prompt is required' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.credits < 5) {
            return res.status(403).json({ message: 'add credits to create more projects' });
        }

        const project = await prisma.websiteProject.create({
            data: {
                name: initial_prompt.length > 50 ? initial_prompt.substring(0, 47)
                    + '...' : initial_prompt,
                initial_prompt,
                userId
            }
        })

        // update user total creation
        await prisma.user.update({
            where: { id: userId },
            data: { totalCreation: { increment: 1 } }
        })

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: initial_prompt,
                projectId: project.id
            }
        })

        // Use transaction to ensure atomic credit deduction and project creation
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { credits: { decrement: 5 } }
            })
        ])

        res.json({ projectId: project.id })

        // Generation now happens via the streaming endpoint (GET /api/project/stream/:id),
        // which the editor opens right after navigation so the user watches the
        // site build live instead of waiting on a blank loader.

    } catch (error: any) {
        console.log(error);
        if (!res.headersSent) res.status(500).json({ message: error.message });
    }
}

// controller function to get a single user project
export const getUserProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const projectId = getStringParam(req.params.projectId);

        if (!projectId) {
            return res.status(400).json({ message: 'Project ID is required' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId },
            include: {
                conversation: {
                    orderBy: { timestamp: 'asc' }
                },
                versions: { orderBy: { timestamp: 'asc' } }
            }
        })

        res.json({ project })

    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });

    }
}

//controller function to get user project
export const getUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        

        const projects = await prisma.websiteProject.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
        })

        res.json({ projects })

    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });

    }
}

// controller function to toggle project publish
export const togglePublish = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        

        const projects = await prisma.websiteProject.findMany({
            where: {userId},
           orderBy: {updatedAt: 'desc'}
        })

        const projectId = getStringParam(req.params.projectId);

        if (!projectId) {
            return res.status(400).json({ message: 'Project ID is required' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId }
        })

        if (!project) {
            return res.status(404).json({ message: 'project not found' });
        }

        await prisma.websiteProject.update({
            where: { id: projectId },
            data: { isPublished: !project.isPublished }
        })

        res.json({ message: project.isPublished ? 'Project Unpublished' : 'Project Published Successfully' })

    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });

    }
}

//controller function to purchase credit
export const purchaseCredits = async (req: Request, res: Response) => {
 try {
    interface Plan {
        credits: number;
        amount: number;
    }

    const plans = {
        basic: {credits: 100 , amount: 5},
        pro: {credits: 400 , amount: 19},
        enterprise: {credits: 1000 , amount: 49}
    }

    const userId= req.userId;
    
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { planId} = req.body as {planId: keyof typeof plans}
    
    if (!planId) {
        return res.status(400).json({ message: 'Plan ID is required' });
    }

    const origin = req.headers.origin as string;

    if (!origin) {
        return res.status(400).json({ message: 'Origin header is required' });
    }

    const plan: Plan = plans[planId]

    if(!plan){
        return res.status(404).json({ message: 'Plan not found'});
    }

    const transaction = await prisma.transaction.create({
        data: {
            userId: userId!,
            planId: req.body.planId,
            amount: plan.amount,
            credits: plan.credits
        }
    })

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

    const session = await stripe.checkout.sessions.create({
        success_url: `${origin}/loading`,
        cancel_url: `${origin}`,
        line_items: [
          {
            price_data : {
                currency: 'usd',
                product_data: {
                    name: `AiSiteBuilder - ${plan.credits} credits`
                },
                unit_amount: Math.floor(transaction.amount)* 100
            },
            quantity: 1
          },
        ],
        mode: 'payment',
        metadata: {
            transactionId: transaction.id,
            appId: 'ai-site-builder'
        },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      });
      res.json({payment_link: session.url})
 } catch (error: any) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
    
 }
}