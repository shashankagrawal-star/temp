import { DelayedError, Job, Worker } from "bullmq";
import { redisConnection } from "./redis";
import { EMAIL_QUEUE_NAME, EmailJobPayload } from "./queue";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { reserveSendSlot } from "./rateLimiter";
import { sendEmail } from "../services/emailService";
import { notifySlackRateLimitHit } from "../services/slackService";
import { indexEmailDoc, ensureEmailsIndex } from "../services/searchService";

/** Delay error used to signal BullMQ that a job should be retried later without counting as a normal failure. */
class DelayedRetry extends Error {
  constructor(public retryAfterMs: number) {
    super("rate-limited, retry later");
  }
}

async function processEmailJob(job: Job<EmailJobPayload>, token?: string): Promise<void> {
  const { emailJobId, senderId } = job.data;

  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { sender: true },
  });
  if (!emailJob) {
    // Row was deleted — nothing to do, treat as complete.
    return;
  }

  // Idempotency guard: if this row was already sent (e.g. job reprocessed
  // after a crash mid-ack), skip re-sending entirely.
  if (emailJob.status === "sent") return;

  const rate = await reserveSendSlot(
    senderId,
    emailJob.sender.hourlyLimitOverride ?? undefined,
    emailJob.sender.minDelayMsOverride ?? undefined
  );
  if (!rate.allowed) {
    if (rate.limitJustHit) {
      await notifySlackRateLimitHit({
        userId: emailJob.userId,
        senderEmail: emailJob.sender.fromEmail,
      });
    }
    throw new DelayedRetry(rate.retryAfterMs ?? 60_000);
  }

  // Claim the row for processing; guards against a duplicate/parallel processor.
  const claimed = await prisma.emailJob.updateMany({
    where: { id: emailJobId, status: { in: ["scheduled", "processing"] } },
    data: { status: "processing" },
  });
  if (claimed.count === 0) {
    // Someone else already claimed/sent it.
    return;
  }

  try {
    const result = await sendEmail({
      smtpHost: emailJob.sender.smtpHost,
      smtpPort: emailJob.sender.smtpPort,
      smtpUser: emailJob.sender.smtpUser,
      smtpPass: emailJob.sender.smtpPass,
      fromEmail: emailJob.sender.fromEmail,
      fromName: emailJob.sender.fromName,
      to: emailJob.recipientEmail,
      subject: emailJob.subject,
      body: emailJob.body,
    });

    const sentAt = new Date();
    await prisma.emailJob.updateMany({
      where: { id: emailJobId, status: "processing" },
      data: { status: "sent", sentAt, bullJobId: job.id },
    });
    console.log(`Sent email ${emailJobId} — preview: ${result.previewUrl}`);

    void indexEmailDoc({
      id: emailJob.id,
      userId: emailJob.userId,
      senderId: emailJob.senderId,
      recipientEmail: emailJob.recipientEmail,
      subject: emailJob.subject,
      body: emailJob.body,
      status: "sent",
      scheduledAt: emailJob.scheduledAt.toISOString(),
      sentAt: sentAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    await prisma.emailJob.updateMany({
      where: { id: emailJobId, status: "processing" },
      data: { status: "failed", errorMessage: message },
    });
    void indexEmailDoc({
      id: emailJob.id,
      userId: emailJob.userId,
      senderId: emailJob.senderId,
      recipientEmail: emailJob.recipientEmail,
      subject: emailJob.subject,
      body: emailJob.body,
      status: "failed",
      scheduledAt: emailJob.scheduledAt.toISOString(),
      sentAt: null,
    });
    throw err;
  }
}

async function main() {
  await ensureEmailsIndex();

  const worker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job, token) => {
      try {
        await processEmailJob(job, token);
      } catch (err) {
        if (err instanceof DelayedRetry) {
          // Push the job back to the correct future slot (next hour window,
          // or after the min-delay window) instead of failing it outright.
          await job.moveToDelayed(Date.now() + err.retryAfterMs, token);
          // BullMQ requires throwing DelayedError after moveToDelayed so the
          // worker treats this as "re-delayed", not completed or failed.
          throw new DelayedError();
        }
        throw err;
      }
    },
    { connection: redisConnection, concurrency: env.workerConcurrency }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  console.log(
    `Email worker started (concurrency=${env.workerConcurrency}, minDelayMs=${env.minDelayMsBetweenSends}, maxPerHourPerSender=${env.maxEmailsPerHourPerSender})`
  );
}

main().catch((err) => {
  console.error("Fatal error starting worker", err);
  process.exit(1);
});
