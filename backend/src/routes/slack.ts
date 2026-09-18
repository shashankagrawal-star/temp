import { Router } from "express";
import { env, isSlackOAuthConfigured } from "../config/env";
import { prisma } from "../db/prisma";
import { requireAuth, signAuthToken } from "../middleware/auth";
import jwt from "jsonwebtoken";
import { exchangeSlackCode, slackAuthorizeUrl } from "../services/slackService";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/authorize", requireAuth, (req, res) => {
  if (!isSlackOAuthConfigured) {
    res.status(503).json({
      error: "Slack OAuth is not configured. Set SLACK_CLIENT_ID/SECRET in backend/.env",
    });
    return;
  }
  // Encode the current user in `state` since Slack's redirect drops our cookie context otherwise.
  const state = jwt.sign({ userId: req.userId }, env.jwtSecret, { expiresIn: "10m" });
  res.redirect(slackAuthorizeUrl(state));
});

router.get("/callback", async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state) {
    res.status(400).send("Missing code/state from Slack");
    return;
  }
  try {
    const { userId } = jwt.verify(state, env.jwtSecret) as { userId: string };
    const result = await exchangeSlackCode(code);

    await prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        accessToken: result.accessToken,
        webhookUrl: result.webhookUrl,
        channel: result.channel,
        teamName: result.teamName,
      },
      create: {
        userId,
        accessToken: result.accessToken,
        webhookUrl: result.webhookUrl,
        channel: result.channel,
        teamName: result.teamName,
      },
    });

    res.redirect(`${env.frontendUrl}/dashboard?slack=connected`);
  } catch (err) {
    console.error("Slack OAuth callback failed", err);
    res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
  }
});

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: req.userId },
    });
    res.json({
      connected: Boolean(integration),
      teamName: integration?.teamName ?? null,
      oauthConfigured: isSlackOAuthConfigured,
    });
  })
);

router.post(
  "/disconnect",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.slackIntegration.deleteMany({ where: { userId: req.userId } });
    res.json({ ok: true });
  })
);

export default router;
