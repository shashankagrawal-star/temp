import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { enqueueEmailSendBulk } from "../queue/queue";
import { indexEmailDocsBulk, searchEmails } from "../services/searchService";

const router = Router();
router.use(requireAuth);

// Bumped above Express's default 100kb JSON limit: a schedule request for a
// 1000+ recipient batch (plus subject/body) easily exceeds that.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  return Array.from(new Set(matches.map((e) => e.toLowerCase())));
}

/** Parses recipients from an uploaded CSV/text file and returns the detected count. */
router.post(
  "/parse-recipients",
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const text = req.file.buffer.toString("utf-8");
    const emails = extractEmails(text);
    res.json({ count: emails.length, emails });
  }
);

const scheduleSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1).max(50_000),
  startTime: z.string().datetime(),
  delayMs: z.number().int().min(0).default(2000),
  hourlyLimit: z.number().int().min(1).optional(),
});

router.post(
  "/schedule",
  asyncHandler(async (req, res) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { senderId, subject, body, recipients, startTime, delayMs, hourlyLimit } = parsed.data;

    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId: req.userId },
    });
    if (!sender) {
      res.status(404).json({ error: "Sender not found" });
      return;
    }

    // The compose form's "delay between emails" and "hourly limit" become this
    // sender's rate-limit overrides, enforced by the worker (Redis-backed, so
    // safe across concurrency/multiple workers) — not just used for staggering.
    await prisma.sender.update({
      where: { id: senderId },
      data: { minDelayMsOverride: delayMs, hourlyLimitOverride: hourlyLimit ?? null },
    });

    const batchId = randomUUID();
    const start = new Date(startTime);

    // Generate ids client-side and use a single bulk INSERT (createMany)
    // instead of N sequential creates inside one transaction — the latter
    // can hit Prisma's default interactive-transaction timeout well before
    // 1000+ recipients, which the assignment explicitly calls out as a case
    // the system needs to handle.
    const rows = recipients.map((recipientEmail, i) => ({
      id: randomUUID(),
      userId: req.userId!,
      senderId,
      batchId,
      recipientEmail,
      subject,
      body,
      scheduledAt: new Date(start.getTime() + i * delayMs),
    }));

    await prisma.emailJob.createMany({ data: rows });

    await enqueueEmailSendBulk(
      rows.map((row) => ({ emailJobId: row.id, senderId: row.senderId, scheduledAt: row.scheduledAt }))
    );
    void indexEmailDocsBulk(
      rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        senderId: row.senderId,
        recipientEmail: row.recipientEmail,
        subject: row.subject,
        body: row.body,
        status: "scheduled",
        scheduledAt: row.scheduledAt.toISOString(),
        sentAt: null,
      }))
    );

    res.status(201).json({ batchId, count: rows.length });
  })
);

router.get(
  "/scheduled",
  asyncHandler(async (req, res) => {
    const jobs = await prisma.emailJob.findMany({
      where: { userId: req.userId, status: { in: ["scheduled", "processing"] } },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        recipientEmail: true,
        subject: true,
        scheduledAt: true,
        status: true,
      },
      take: 200,
    });
    res.json(jobs);
  })
);

router.get(
  "/sent",
  asyncHandler(async (req, res) => {
    const jobs = await prisma.emailJob.findMany({
      where: { userId: req.userId, status: { in: ["sent", "failed"] } },
      orderBy: { sentAt: "desc" },
      select: {
        id: true,
        recipientEmail: true,
        subject: true,
        sentAt: true,
        status: true,
        errorMessage: true,
      },
      take: 200,
    });
    res.json(jobs);
  })
);

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "");
    const results = await searchEmails(req.userId!, q);
    res.json(results);
  })
);

export default router;
