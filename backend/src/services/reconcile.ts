import { prisma } from "../db/prisma";
import { enqueueEmailSend } from "../queue/queue";

/**
 * Boot-time (not cron) safety net: re-enqueues any DB rows still marked
 * `scheduled` that BullMQ doesn't already know about. Because enqueueEmailSend
 * uses a deterministic jobId, this is a no-op for jobs Redis already has and
 * only recreates ones lost to a wiped/ephemeral Redis instance — future
 * emails still send at the correct time and nothing is duplicated.
 */
export async function reconcileScheduledEmails(): Promise<void> {
  const pending = await prisma.emailJob.findMany({
    where: { status: "scheduled" },
    select: { id: true, senderId: true, scheduledAt: true },
  });

  if (pending.length === 0) return;

  console.log(`Reconciling ${pending.length} scheduled email job(s) with the queue...`);
  for (const job of pending) {
    await enqueueEmailSend({
      emailJobId: job.id,
      senderId: job.senderId,
      scheduledAt: job.scheduledAt,
    });
  }
}
