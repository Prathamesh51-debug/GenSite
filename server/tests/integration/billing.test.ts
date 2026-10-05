import { describe, it, expect, beforeEach } from 'vitest';
import { billingService } from '@/billing/billing.service.js';
import { prisma, resetDatabase, createUser, creditsOf } from './helpers.js';

beforeEach(resetDatabase);

const session = (id: string, userId: string) =>
  ({ id, metadata: { appId: 'ai-site-builder', userId, planId: 'pro', credits: '400', amountCents: '1900' } }) as any;

describe('Stripe fulfilment on real Postgres', () => {
  it('credits a purchase once when Stripe delivers the same event five times at once', async () => {
    const user = await createUser(25);

    await Promise.all(Array.from({ length: 5 }, () => billingService.fulfilSession(session('cs_test_1', user.id))));

    expect(await creditsOf(user.id)).toBe(425);
    expect(await prisma.transaction.count({ where: { stripeSessionId: 'cs_test_1' } })).toBe(1);
  });

  it('credits two different purchases separately', async () => {
    const user = await createUser(0);

    await Promise.all([billingService.fulfilSession(session('cs_a', user.id)), billingService.fulfilSession(session('cs_b', user.id))]);

    expect(await creditsOf(user.id)).toBe(800);
  });

  it('claws back a refunded purchase once, even when refund events race', async () => {
    const user = await createUser(25);
    await billingService.fulfilSession(session('cs_refund', user.id));

    await Promise.all([billingService.clawbackSession(session('cs_refund', user.id)), billingService.clawbackSession(session('cs_refund', user.id))]);

    expect(await creditsOf(user.id)).toBe(25);
    expect((await prisma.transaction.findUniqueOrThrow({ where: { stripeSessionId: 'cs_refund' } })).isPaid).toBe(false);
  });
});
