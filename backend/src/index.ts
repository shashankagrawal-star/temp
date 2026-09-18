import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { env } from "./config/env";
import authRouter from "./routes/auth";
import slackRouter from "./routes/slack";
import sendersRouter from "./routes/senders";
import emailsRouter from "./routes/emails";
import { mountBullBoard } from "./queue/boardMount";
import { ensureEmailsIndex } from "./services/searchService";
import { reconcileScheduledEmails } from "./services/reconcile";

async function main() {
  const app = express();

  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  // Default express.json() body limit (100kb) is too small for a schedule
  // request carrying 1000+ recipients plus subject/body.
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(passport.initialize());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/slack", slackRouter);
  app.use("/api/senders", sendersRouter);
  app.use("/api/emails", emailsRouter);

  // Live BullMQ dashboard for real-time queue visibility.
  app.use("/admin/queues", mountBullBoard());

  // Global error handler: catches anything asyncHandler-wrapped routes pass
  // to next(err) (and sync throws), so a single failing request returns a
  // clean 500 instead of becoming an unhandled rejection that crashes the
  // whole process (Node terminates on unhandled rejections by default).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled request error:", err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  });

  await ensureEmailsIndex();
  // Boot-time reconciliation (not a cron): re-enqueues any scheduled rows
  // the queue doesn't already know about, so a wiped Redis never loses jobs.
  await reconcileScheduledEmails();

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
    console.log(`BullMQ dashboard at http://localhost:${env.port}/admin/queues`);
  });
}

main().catch((err) => {
  console.error("Fatal error during startup", err);
  process.exit(1);
});
