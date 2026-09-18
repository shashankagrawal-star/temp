import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env, isGoogleOAuthConfigured } from "../config/env";
import { prisma } from "../db/prisma";
import { requireAuth, signAuthToken } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

if (isGoogleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Google account has no email"));

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            },
            create: {
              googleId: profile.id,
              email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            },
          });
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );

  router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
  );

  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: `${env.frontendUrl}/login?error=oauth_failed` }),
    (req, res) => {
      const user = req.user as { id: string };
      const token = signAuthToken(user.id);
      res.cookie(env.cookieName, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.nodeEnv === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.redirect(`${env.frontendUrl}/dashboard`);
    }
  );
} else {
  router.get("/google", (_req, res) => {
    res.status(503).json({
      error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID/SECRET in backend/.env",
    });
  });
}

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  })
);

router.post("/logout", (_req, res) => {
  res.clearCookie(env.cookieName);
  res.json({ ok: true });
});

export default router;
