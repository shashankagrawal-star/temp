import type { SentEmail } from "@/lib/types";
import { Table, Column } from "./ui/Table";
import { StatusBadge } from "./ui/StatusBadge";
import { EmptyState } from "./ui/EmptyState";

export function SentEmailsTable({ rows, loading }: { rows: SentEmail[]; loading: boolean }) {
  const columns: Column<SentEmail>[] = [
    { key: "recipientEmail", header: "Email", render: (r) => r.recipientEmail },
    { key: "subject", header: "Subject", render: (r) => r.subject },
    {
      key: "sentAt",
      header: "Sent time",
      render: (r) => (r.sentAt ? new Date(r.sentAt).toLocaleString() : "—"),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      loading={loading}
      emptyState={
        <EmptyState
          title="No sent emails yet"
          description="Emails will show up here once they've been delivered."
        />
      }
    />
  );
}
