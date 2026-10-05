import prisma from '@/platform/db/prisma.js';

export type ChargeKind = 'generate' | 'revision' | 'elementEdit';

export const STALE_CHARGE_MS = 20 * 60_000;

type Db = Pick<typeof prisma, '$transaction' | 'creditCharge'>;

export const chargeCredits = (
  userId: string,
  amount: number,
  kind: ChargeKind,
  db: Db = prisma
): Promise<string | null> =>
  db.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: { id: userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } },
    });
    if (count === 0) return null;
    const charge = await tx.creditCharge.create({ data: { userId, amount, kind } });
    return charge.id;
  });

const close = (chargeId: string, status: 'settled' | 'refunded', restore: (amount: number) => number, db: Db) =>
  db.$transaction(async (tx) => {
    const { count } = await tx.creditCharge.updateMany({
      where: { id: chargeId, status: 'pending' },
      data: { status },
    });
    if (count === 0) return false;
    const charge = await tx.creditCharge.findUnique({ where: { id: chargeId } });
    const amount = charge ? restore(charge.amount) : 0;
    if (charge && amount > 0) {
      await tx.user.update({ where: { id: charge.userId }, data: { credits: { increment: amount } } });
    }
    return true;
  });

export const settleCharge = (chargeId: string, partialRefund = 0, db: Db = prisma): Promise<boolean> =>
  close(chargeId, 'settled', (amount) => Math.min(Math.max(partialRefund, 0), amount), db);

export const refundCharge = (chargeId: string, db: Db = prisma): Promise<boolean> =>
  close(chargeId, 'refunded', (amount) => amount, db);

export const sweepStaleCharges = async (now = Date.now(), db: Db = prisma): Promise<number> => {
  const stale = await db.creditCharge.findMany({
    where: { status: 'pending', createdAt: { lt: new Date(now - STALE_CHARGE_MS) } },
    select: { id: true },
    take: 500,
  });
  let refunded = 0;
  for (const { id } of stale) {
    if (await refundCharge(id, db).catch(() => false)) refunded++;
  }
  return refunded;
};

export const startChargeSweeper = (intervalMs = 5 * 60_000): void => {
  const run = () =>
    sweepStaleCharges()
      .then((n) => { if (n) console.log(`[credits] refunded ${n} stale pending charge(s)`); })
      .catch((err) => console.error('[credits] sweep failed:', err?.message));
  run();
  setInterval(run, intervalMs).unref();
};

export const freeDailyAiCap = (): number => {
  const raw = Number(process.env.FREE_DAILY_AI_CAP);
  return Number.isFinite(raw) && raw >= 0 ? raw : 300;
};

export const freeCapReached = async (userId: string, db: typeof prisma = prisma): Promise<boolean> => {
  const cap = freeDailyAiCap();
  if (cap === 0) return false;
  const paid = await db.transaction.count({ where: { userId, isPaid: true } });
  if (paid > 0) return false;
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const used = await db.creditCharge.count({
    where: {
      createdAt: { gte: startOfDay },
      status: { not: 'refunded' },
      user: { transactions: { none: { isPaid: true } } },
    },
  });
  return used >= cap;
};
