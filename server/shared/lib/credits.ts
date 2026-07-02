import prisma from './prisma.js';

// Atomically charge `amount` credits, but only if the balance covers it. The
// balance check and decrement are one conditional UPDATE, so concurrent requests
// can't both pass a stale read and overspend. Returns false (nothing changed) when
// credits are insufficient. Pass a `tx` client to charge inside a larger transaction.
export const chargeCredits = async (
  userId: string,
  amount: number,
  tx: { user: typeof prisma.user } = prisma
): Promise<boolean> => {
  const { count } = await tx.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });
  return count > 0;
};

// Refund credits. Only call after a charge actually succeeded.
export const refundCredits = async (userId: string, amount: number): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
};
