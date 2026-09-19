"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/DashboardContext";
import { EmailList } from "@/components/EmailList";
import { ComposeEmailModal } from "@/components/ComposeEmailModal";
import { SearchIcon } from "@/components/ui/EmptyState";

export default function DashboardPage() {
  const { tab, scheduled, sent, loading, refresh, composeOpen, closeCompose } = useDashboard();
  const [query, setQuery] = useState("");

  const rows = tab === "scheduled" ? scheduled : sent;
  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) => r.recipientEmail.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line bg-surface px-6 py-4">
        <div className="relative max-w-md flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg border border-line bg-canvas py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg p-2 text-ink-subtle transition-colors hover:bg-canvas hover:text-ink"
          aria-label="Refresh"
        >
          <RefreshIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <EmailList
          rows={filtered}
          loading={loading}
          emptyTitle={tab === "scheduled" ? "No scheduled emails yet" : "No sent emails yet"}
          emptyDescription={
            tab === "scheduled"
              ? "Click Compose to schedule your first campaign."
              : "Emails will show up here once they've been delivered."
          }
        />
      </div>

      <ComposeEmailModal open={composeOpen} onClose={closeCompose} onScheduled={refresh} />
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M15 5.5A6.5 6.5 0 1 0 16 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M15.5 2v4h-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
