export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Sender {
  id: string;
  fromEmail: string;
  fromName: string | null;
  createdAt: string;
}

export type EmailStatus = "scheduled" | "processing" | "sent" | "failed";

/** Row shape returned by GET /api/emails/scheduled. */
export interface ScheduledEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  scheduledAt: string;
  status: EmailStatus;
}

/** Row shape returned by GET /api/emails/sent. */
export interface SentEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  sentAt: string | null;
  status: EmailStatus;
  errorMessage: string | null;
}

/** Document shape returned by GET /api/emails/search (Elasticsearch). */
export interface EmailSearchResult {
  id: string;
  recipientEmail: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  oauthConfigured: boolean;
}

export interface ScheduleRequest {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayMs: number;
  hourlyLimit?: number;
}

export interface ScheduleResponse {
  batchId: string;
  count: number;
}

export interface ParsedRecipients {
  count: number;
  emails: string[];
}
