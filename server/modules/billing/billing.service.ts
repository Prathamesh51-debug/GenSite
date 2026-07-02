import Stripe from 'stripe';
import prisma from '../../shared/lib/prisma.js';
import { getPlan } from '../../shared/lib/plans.js';
import { BadRequestError, NotFoundError } from '../../shared/http/AppError.js';

// One process-wide client. API version pinned so a Stripe-side default bump can't
// silently reshape event payloads — upgrades become a deliberate change of this literal.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-12-15.clover',
});

export const billingService = {
    // Create a Checkout session. No DB row is written here — the sale is recorded only
    // when Stripe confirms payment (webhook), keyed by session id, so abandoned
    // checkouts leave no orphan transactions.
    async createCheckout(userId: string, planId: string, origin: string) {
        if (!origin) throw new BadRequestError('Origin header is required');
        const plan = getPlan(planId);
        if (!plan) throw new NotFoundError('Plan not found');

        const amountCents = Math.round(plan.amount * 100);
        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/loading`,
            cancel_url: `${origin}`,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: `GenSite - ${plan.credits} credits` },
                    unit_amount: amountCents,
                },
                quantity: 1,
            }],
            mode: 'payment',
            metadata: {
                userId,
                planId,
                credits: String(plan.credits),
                amountCents: String(amountCents),
                appId: 'ai-site-builder',
            },
            // Stripe requires expires_at >= 30 min out; give margin so clock/latency
            // don't push it under the floor.
            expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        });
        return session.url;
    },

    // Record a completed purchase + grant credits exactly once. Insert and increment
    // share one transaction; a duplicate delivery fails the unique key (P2002) and is
    // an idempotent no-op.
    async fulfilSession(session: Stripe.Checkout.Session) {
        const { userId, planId, credits, amountCents, appId } = (session.metadata || {}) as Record<string, string>;
        if (appId !== 'ai-site-builder' || !userId) return;
        try {
            await prisma.$transaction(async (tx) => {
                await tx.transaction.create({
                    data: {
                        stripeSessionId: session.id,
                        userId,
                        planId: planId ?? 'unknown',
                        amountCents: Number(amountCents) || 0,
                        credits: Number(credits) || 0,
                        isPaid: true,
                    },
                });
                await tx.user.update({
                    where: { id: userId },
                    data: { credits: { increment: Number(credits) || 0 } },
                });
            });
        } catch (err: any) {
            if (err?.code === 'P2002') return; // already fulfilled
            throw err;
        }
    },

    // Reverse a fulfilled purchase (refund/lost dispute). Flip isPaid and deduct in ONE
    // transaction so a crash between them can't consume the guard without deducting.
    async clawbackSession(session: Stripe.Checkout.Session) {
        await prisma.$transaction(async (db) => {
            const { count } = await db.transaction.updateMany({
                where: { stripeSessionId: session.id, isPaid: true },
                data: { isPaid: false },
            });
            if (count === 0) return; // unknown or already reversed
            const t = await db.transaction.findUnique({ where: { stripeSessionId: session.id } });
            if (t) await db.user.update({ where: { id: t.userId }, data: { credits: { decrement: t.credits } } });
        });
    },

    async clawbackByPaymentIntent(paymentIntentId?: string | null) {
        if (!paymentIntentId) return;
        const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId });
        const session = sessions.data[0];
        if (session) await billingService.clawbackSession(session);
    },
};
