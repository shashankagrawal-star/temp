import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthTokenPayload {
  userId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ userId } satisfies AuthTokenPayload, env.jwtSecret, {
    expiresIn: "7d",
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[env.cookieName];
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
