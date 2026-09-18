"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ScheduledEmail, SentEmail } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ScheduledEmailsTable } from "@/components/ScheduledEmailsTable";
import { SentEmailsTable } from "@/components/SentEmailsTable";
import { ComposeEmailModal } from "@/components/ComposeEmailModal";
import { useToast } from "@/components/ui/Toast";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduledRes, sentRes] = await Promise.all([api.scheduledEmails(), api.sentEmails()]);
      setScheduled(scheduledRes);
      setSent(sentRes);
    } catch {
      showToast("Failed to load emails", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refresh();
    // Poll periodically so statuses (scheduled -> sent) update without a manual refresh.
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setTab("scheduled")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "scheduled" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            Scheduled Emails
          </button>
          <button
            onClick={() => setTab("sent")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "sent" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            Sent Emails
          </button>
        </div>

        <Button onClick={() => setComposeOpen(true)}>+ Compose New Email</Button>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        {tab === "scheduled" ? (
          <ScheduledEmailsTable rows={scheduled} loading={loading} />
        ) : (
          <SentEmailsTable rows={sent} loading={loading} />
        )}
      </div>

      <ComposeEmailModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={refresh}
      />
    </div>
  );
}
