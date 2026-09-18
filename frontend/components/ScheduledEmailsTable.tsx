import type { ScheduledEmail } from "@/lib/types";
import { Table, Column } from "./ui/Table";
import { StatusBadge } from "./ui/StatusBadge";
import { EmptyState } from "./ui/EmptyState";

export function ScheduledEmailsTable({
  rows,
  loading,
}: {
  rows: ScheduledEmail[];
  loading: boolean;
}) {
  const columns: Column<ScheduledEmail>[] = [
    { key: "recipientEmail", header: "Email", render: (r) => r.recipientEmail },
    { key: "subject", header: "Subject", render: (r) => r.subject },
    {
      key: "scheduledAt",
      header: "Scheduled time",
      render: (r) => new Date(r.scheduledAt).toLocaleString(),
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
          title="No scheduled emails yet"
          description="Click “Compose New Email” to schedule your first campaign."
        />
      }
    />
  );
}
