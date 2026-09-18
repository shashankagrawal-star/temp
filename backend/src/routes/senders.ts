import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { createEtherealAccount } from "../services/emailService";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const senders = await prisma.sender.findMany({
      where: { userId: req.userId },
      select: { id: true, fromEmail: true, fromName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(senders);
  })
);

const createSenderSchema = z.object({
  fromName: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSenderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const account = await createEtherealAccount();
    const sender = await prisma.sender.create({
      data: {
        userId: req.userId!,
        fromEmail: account.fromEmail,
        fromName: parsed.data.fromName,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        smtpUser: account.smtpUser,
        smtpPass: account.smtpPass,
      },
    });

    res.status(201).json({
      id: sender.id,
      fromEmail: sender.fromEmail,
      fromName: sender.fromName,
      createdAt: sender.createdAt,
    });
  })
);

export default router;
