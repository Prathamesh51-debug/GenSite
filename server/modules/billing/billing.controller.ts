import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, billingService } from './billing.service.js';

export const purchaseCredits = async (req: Request, res: Response) => {
    const { planId } = req.body as { planId: string };
    const url = await billingService.createCheckout(req.userId!, planId, req.headers.origin as string);
    res.json({ payment_link: url });
};

// Stripe calls this directly (no auth). It verifies the signature and is mounted with
// a raw body parser, and manages its own responses, so it isn't wrapped.
export const stripeWebhook = async (request: Request, response: Response) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
    if (!endpointSecret) {
        console.error('STRIPE_WEBHOOK_SECRET is not configured — cannot verify webhook.');
        return response.sendStatus(500);
    }

    const signature = request.headers['stripe-signature'] as string;
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(request.body, signature, endpointSecret);
    } catch (err: any) {
        console.error('⚠️ Webhook signature verification failed.', err.message);
        return response.sendStatus(400);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                await billingService.fulfilSession(event.data.object as Stripe.Checkout.Session);
                break;
            }
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const sessionList = await stripe.checkout.sessions.list({ payment_intent: paymentIntent.id });
                const session = sessionList.data[0];
                if (session) await billingService.fulfilSession(session);
                break;
            }
            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge;
                await billingService.clawbackByPaymentIntent(charge.payment_intent as string | null);
                break;
            }
            case 'charge.dispute.funds_withdrawn': {
                const dispute = event.data.object as Stripe.Dispute;
                const charge = await stripe.charges.retrieve(dispute.charge as string);
                await billingService.clawbackByPaymentIntent(charge.payment_intent as string | null);
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (err: any) {
        console.error('Webhook handler error:', err?.message);
        return response.sendStatus(500);
    }

    response.json({ received: true });
};
