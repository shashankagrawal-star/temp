import { env, isSlackOAuthConfigured } from "../config/env";
import { prisma } from "../db/prisma";

export function slackAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.slackClientId,
    scope: "incoming-webhook,chat:write",
    redirect_uri: env.slackRedirectUri,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  team?: { name?: string };
  incoming_webhook?: { url?: string; channel?: string };
  error?: string;
}

export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  webhookUrl: string;
  channel?: string;
  teamName?: string;
}> {
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.slackClientId,
      client_secret: env.slackClientSecret,
      code,
      redirect_uri: env.slackRedirectUri,
    }),
  });
  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok || !data.access_token || !data.incoming_webhook?.url) {
    throw new Error(`Slack OAuth exchange failed: ${data.error ?? "unknown error"}`);
  }
  return {
    accessToken: data.access_token,
    webhookUrl: data.incoming_webhook.url,
    channel: data.incoming_webhook.channel,
    teamName: data.team?.name,
  };
}

/**
 * Sends a live Slack message to the user's connected workspace, if any.
 * No-op (never throws) if the user hasn't connected Slack, or if OAuth
 * hasn't been configured at all — rate limiting must keep working regardless.
 */
export async function notifySlackRateLimitHit(params: {
  userId: string;
  senderEmail: string;
}): Promise<void> {
  if (!isSlackOAuthConfigured) return;

  const integration = await prisma.slackIntegration.findUnique({
    where: { userId: params.userId },
  });
  if (!integration) return;

  try {
    await fetch(integration.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `:warning: Hourly send limit reached for sender *${params.senderEmail}*. Remaining emails have been rescheduled into the next hour window.`,
      }),
    });
  } catch (err) {
    console.error("Failed to deliver Slack rate-limit notification", err);
  }
}
