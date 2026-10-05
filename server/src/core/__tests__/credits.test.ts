import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/platform/db/prisma.js', () => ({ default: {} }));

import { chargeCredits, settleCharge, refundCharge, sweepStaleCharges, STALE_CHARGE_MS } from '../credits.js';

type Charge = { id: string; userId: string; amount: number; kind: string; status: string; createdAt: Date };

const makeDb = (balances: Record<string, number>) => {
  const users = new Map(Object.entries(balances).map(([id, credits]) => [id, { id, credits }]));
  const charges = new Map<string, Charge>();
  let seq = 0;
  const db: any = {
    user: {
      updateMany: async ({ where, data }: any) => {
        const u = users.get(where.id);
        if (!u || u.credits < where.credits.gte) return { count: 0 };
        u.credits -= data.credits.decrement;
        return { count: 1 };
      },
      update: async ({ where, data }: any) => {
        const u = users.get(where.id)!;
        u.credits += data.credits.increment;
        return u;
      },
    },
    creditCharge: {
      create: async ({ data }: any) => {
        const c = { id: `c${++seq}`, status: 'pending', createdAt: new Date(), ...data };
        charges.set(c.id, c);
        return c;
      },
      updateMany: async ({ where, data }: any) => {
        const c = charges.get(where.id);
        if (!c || c.status !== where.status) return { count: 0 };
        c.status = data.status;
        return { count: 1 };
      },
      findUnique: async ({ where }: any) => charges.get(where.id) ?? null,
      findMany: async ({ where }: any) =>
        [...charges.values()].filter((c) => c.status === where.status && c.createdAt < where.createdAt.lt),
    },
  };
  db.$transaction = (fn: any) => fn(db);
  return { db, credits: (id: string) => users.get(id)!.credits, charges };
};

describe('credit ledger', () => {
  let t: ReturnType<typeof makeDb>;
  beforeEach(() => { t = makeDb({ u1: 25 }); });

  it('charges atomically and refuses to overspend', async () => {
    const id = await chargeCredits('u1', 20, 'generate', t.db);
    expect(id).toBeTruthy();
    expect(t.credits('u1')).toBe(5);
    expect(await chargeCredits('u1', 20, 'generate', t.db)).toBeNull();
    expect(t.credits('u1')).toBe(5);
    expect(t.charges.size).toBe(1);
  });

  it('refunds exactly once even when retried or raced', async () => {
    const id = (await chargeCredits('u1', 5, 'revision', t.db))!;
    const results = await Promise.all([refundCharge(id, t.db), refundCharge(id, t.db), refundCharge(id, t.db)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(t.credits('u1')).toBe(25);
  });

  it('a settled charge can no longer be refunded', async () => {
    const id = (await chargeCredits('u1', 5, 'elementEdit', t.db))!;
    expect(await settleCharge(id, 0, t.db)).toBe(true);
    expect(await refundCharge(id, t.db)).toBe(false);
    expect(t.credits('u1')).toBe(20);
  });

  it('settles with a partial refund for a premium downgrade, capped at the charge', async () => {
    const a = (await chargeCredits('u1', 20, 'generate', t.db))!;
    await settleCharge(a, 15, t.db);
    expect(t.credits('u1')).toBe(20);
    const b = (await chargeCredits('u1', 5, 'generate', t.db))!;
    await settleCharge(b, 999, t.db);
    expect(t.credits('u1')).toBe(20);
  });

  it('sweeper refunds only charges left pending past the stale window', async () => {
    const stale = (await chargeCredits('u1', 5, 'generate', t.db))!;
    const fresh = (await chargeCredits('u1', 5, 'generate', t.db))!;
    const done = (await chargeCredits('u1', 5, 'generate', t.db))!;
    await settleCharge(done, 0, t.db);
    t.charges.get(stale)!.createdAt = new Date(Date.now() - STALE_CHARGE_MS - 1000);
    t.charges.get(done)!.createdAt = new Date(Date.now() - STALE_CHARGE_MS - 1000);

    expect(await sweepStaleCharges(Date.now(), t.db)).toBe(1);
    expect(t.charges.get(stale)!.status).toBe('refunded');
    expect(t.charges.get(fresh)!.status).toBe('pending');
    expect(t.credits('u1')).toBe(15);
  });
});
