import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const EMAIL_QUEUE_NAME = "email-queue";

export interface EmailJobPayload {
  emailJobId: string;
  senderId: string;
}

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 60 * 60 * 24 * 7 },
    removeOnFail: { age: 60 * 60 * 24 * 30 },
  },
});

export function emailJobBullId(emailJobId: string): string {
  return `email-${emailJobId}`;
}

/**
 * Enqueue (or idempotently re-enqueue) a delayed send job for an EmailJob row.
 * Deterministic jobId means calling this twice for the same row is a no-op.
 */
export async function enqueueEmailSend(params: {
  emailJobId: string;
  senderId: string;
  scheduledAt: Date;
}) {
  const delay = Math.max(0, params.scheduledAt.getTime() - Date.now());
  const jobId = emailJobBullId(params.emailJobId);
  return emailQueue.add(
    "send-email",
    { emailJobId: params.emailJobId, senderId: params.senderId },
    { jobId, delay }
  );
}

/**
 * Bulk variant of enqueueEmailSend — a single round trip to Redis instead of
 * one per job, so scheduling a batch of 1000+ recipients doesn't serialize
 * into 1000 sequential network calls.
 */
export async function enqueueEmailSendBulk(
  jobs: Array<{ emailJobId: string; senderId: string; scheduledAt: Date }>
) {
  if (jobs.length === 0) return [];
  const now = Date.now();
  return emailQueue.addBulk(
    jobs.map((job) => ({
      name: "send-email",
      data: { emailJobId: job.emailJobId, senderId: job.senderId },
      opts: {
        jobId: emailJobBullId(job.emailJobId),
        delay: Math.max(0, job.scheduledAt.getTime() - now),
      },
    }))
  );
}
