import type {
  EmailSearchResult,
  ParsedRecipients,
  ScheduledEmail,
  ScheduleRequest,
  ScheduleResponse,
  Sender,
  SentEmail,
  SlackStatus,
  User,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<User>("/api/auth/me"),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  slackStatus: () => request<SlackStatus>("/api/slack/status"),
  slackDisconnect: () => request<{ ok: true }>("/api/slack/disconnect", { method: "POST" }),
  slackAuthorizeUrl: () => `${API_URL}/api/slack/authorize`,
  googleLoginUrl: () => `${API_URL}/api/auth/google`,

  senders: () => request<Sender[]>("/api/senders"),
  createSender: (fromName?: string) =>
    request<Sender>("/api/senders", { method: "POST", body: JSON.stringify({ fromName }) }),

  scheduledEmails: () => request<ScheduledEmail[]>("/api/emails/scheduled"),
  sentEmails: () => request<SentEmail[]>("/api/emails/sent"),
  searchEmails: (q: string) =>
    request<EmailSearchResult[]>(`/api/emails/search?q=${encodeURIComponent(q)}`),

  parseRecipients: async (file: File): Promise<ParsedRecipients> => {
    const form = new FormData();
    form.append("file", file);
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/emails/parse-recipients`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
    } catch {
      throw new ApiError("Can't reach the server to parse this file.", 0);
    }
    if (!res.ok) throw new ApiError("Failed to parse recipients file", res.status);
    return res.json();
  },

  scheduleEmails: (payload: ScheduleRequest) =>
    request<ScheduleResponse>("/api/emails/schedule", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
