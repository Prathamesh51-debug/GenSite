import { describe, it, expect, beforeEach } from 'vitest';
import { chargeCredits, refundCharge, settleCharge, sweepStaleCharges, STALE_CHARGE_MS } from '@/core/credits.js';
import { prisma, resetDatabase, createUser, creditsOf } from './helpers.js';

beforeEach(resetDatabase);

describe('credit ledger on real Postgres', () => {
  it('lets 100 simultaneous charges spend exactly the balance and never more', async () => {
    const user = await createUser(25);

    const results = await Promise.all(Array.from({ length: 100 }, () => chargeCredits(user.id, 5, 'generate')));

    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await creditsOf(user.id)).toBe(0);
    expect(await prisma.creditCharge.count({ where: { userId: user.id, status: 'pending' } })).toBe(5);
  });

  it('resolves each charge exactly once when refunds and settles race', async () => {
    const user = await createUser(25);
    const ids = (await Promise.all(Array.from({ length: 5 }, () => chargeCredits(user.id, 5, 'revision')))) as string[];

    const outcomes = await Promise.all(ids.map((id) => Promise.all([refundCharge(id), refundCharge(id), settleCharge(id)])));

    for (const winners of outcomes) expect(winners.filter(Boolean)).toHaveLength(1);
    const refunded = await prisma.creditCharge.count({ where: { userId: user.id, status: 'refunded' } });
    expect(await creditsOf(user.id)).toBe(refunded * 5);
    expect(await prisma.creditCharge.count({ where: { userId: user.id, status: 'pending' } })).toBe(0);
  });

  it('refunds a charge left pending by a crash once, even with two sweepers running', async () => {
    const user = await createUser(25);
    const stale = (await chargeCredits(user.id, 5, 'generate'))!;
    const fresh = (await chargeCredits(user.id, 5, 'generate'))!;
    await prisma.creditCharge.update({ where: { id: stale }, data: { createdAt: new Date(Date.now() - STALE_CHARGE_MS - 60_000) } });

    const [a, b] = await Promise.all([sweepStaleCharges(), sweepStaleCharges()]);

    expect(a + b).toBe(1);
    expect(await creditsOf(user.id)).toBe(20);
    expect((await prisma.creditCharge.findUniqueOrThrow({ where: { id: stale } })).status).toBe('refunded');
    expect((await prisma.creditCharge.findUniqueOrThrow({ where: { id: fresh } })).status).toBe('pending');
  });

  it('settles a downgraded premium build with only the surcharge refunded', async () => {
    const user = await createUser(25);
    const id = (await chargeCredits(user.id, 20, 'generate'))!;

    await settleCharge(id, 15);

    expect(await creditsOf(user.id)).toBe(20);
    expect((await prisma.creditCharge.findUniqueOrThrow({ where: { id } })).status).toBe('settled');
  });
});
