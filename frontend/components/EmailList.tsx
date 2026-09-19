import type { ScheduledEmail, SentEmail } from "@/lib/types";
import { EmptyState, InboxIcon } from "./ui/EmptyState";
import { StatusBadge } from "./ui/StatusBadge";

type Row = ScheduledEmail | SentEmail;

function rowTime(row: Row): string | null {
  return "scheduledAt" in row ? row.scheduledAt : row.sentAt;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EmailList({
  rows,
  loading,
  emptyTitle,
  emptyDescription,
}: {
  rows: Row[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (loading) {
    return (
      <div className="divide-y divide-line">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="skeleton h-4 w-48 rounded" />
            <div className="skeleton h-4 flex-1 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState icon={<InboxIcon />} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="divide-y divide-line">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-canvas/70"
        >
          <div className="w-64 shrink-0 truncate text-sm font-semibold text-ink">
            To: {row.recipientEmail}
          </div>
          <div className="w-28 shrink-0">
            <StatusBadge status={row.status} />
          </div>
          <div className="min-w-0 flex-1 truncate text-sm">
            <span className="font-medium text-ink">{row.subject}</span>
            <span className="text-ink-subtle"> — {formatTime(rowTime(row))}</span>
          </div>
          <button
            type="button"
            className="shrink-0 text-ink-subtle transition-colors hover:text-amber-500"
            aria-label="Star"
          >
            <StarIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.2l-3.8 2.1.7-4.3-3.1-3 4.3-.6L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
