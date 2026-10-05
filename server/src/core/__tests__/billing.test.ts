import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  credits: 0,
  rows: new Map<string, { userId: string; credits: number; isPaid: boolean }>(),
}));

vi.mock('stripe', () => ({ default: class { checkout = { sessions: {} }; } }));

vi.mock('@/platform/db/prisma.js', () => {
  const db: any = {
    transaction: {
      create: async ({ data }: any) => {
        if (state.rows.has(data.stripeSessionId)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        state.rows.set(data.stripeSessionId, { userId: data.userId, credits: data.credits, isPaid: data.isPaid });
      },
      updateMany: async ({ where, data }: any) => {
        const row = state.rows.get(where.stripeSessionId);
        if (!row || row.isPaid !== where.isPaid) return { count: 0 };
        row.isPaid = data.isPaid;
        return { count: 1 };
      },
      findUnique: async ({ where }: any) => state.rows.get(where.stripeSessionId) ?? null,
    },
    user: {
      update: async ({ data }: any) => {
        state.credits += data.credits.increment ?? 0;
        state.credits -= data.credits.decrement ?? 0;
      },
    },
  };
  db.$transaction = (fn: any) => fn(db);
  return { default: db };
});

import { billingService } from '@/modules/billing/application/billing.service.js';

const session = (id: string, metadata: Record<string, string> = {}) =>
  ({ id, metadata: { appId: 'ai-site-builder', userId: 'u1', planId: 'pro', credits: '400', amountCents: '1900', ...metadata } }) as any;

describe('Stripe fulfilment', () => {
  beforeEach(() => { state.credits = 0; state.rows.clear(); });

  it('grants credits once even when Stripe redelivers the event', async () => {
    await billingService.fulfilSession(session('cs_1'));
    await billingService.fulfilSession(session('cs_1'));
    await billingService.fulfilSession(session('cs_1'));
    expect(state.credits).toBe(400);
    expect(state.rows.size).toBe(1);
  });

  it('ignores sessions that belong to another app or have no user', async () => {
    await billingService.fulfilSession(session('cs_2', { appId: 'other' }));
    await billingService.fulfilSession(session('cs_3', { userId: '' }));
    expect(state.credits).toBe(0);
  });

  it('claws back a refunded purchase exactly once', async () => {
    await billingService.fulfilSession(session('cs_4'));
    await billingService.clawbackSession(session('cs_4'));
    await billingService.clawbackSession(session('cs_4'));
    expect(state.credits).toBe(0);
    expect(state.rows.get('cs_4')!.isPaid).toBe(false);
  });

  it('a clawback for an unknown session is a no-op', async () => {
    await billingService.clawbackSession(session('cs_unknown'));
    expect(state.credits).toBe(0);
  });
});
