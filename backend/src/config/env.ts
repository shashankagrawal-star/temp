import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  frontendUrl: required("FRONTEND_URL", "http://localhost:3000"),
  backendUrl: required("BACKEND_URL", "http://localhost:4000"),

  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  elasticsearchUrl: required("ELASTICSEARCH_URL", "http://localhost:9200"),

  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  cookieName: process.env.COOKIE_NAME ?? "ri_session",

  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ??
    "http://localhost:4000/api/auth/google/callback",

  slackClientId: process.env.SLACK_CLIENT_ID ?? "",
  slackClientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
  slackRedirectUri:
    process.env.SLACK_REDIRECT_URI ?? "http://localhost:4000/api/slack/callback",

  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
  minDelayMsBetweenSends: Number(process.env.MIN_DELAY_MS_BETWEEN_SENDS ?? 2000),
  maxEmailsPerHourPerSender: Number(
    process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? 200
  ),
};

export const isGoogleOAuthConfigured = Boolean(
  env.googleClientId && env.googleClientSecret
);
export const isSlackOAuthConfigured = Boolean(
  env.slackClientId && env.slackClientSecret
);
