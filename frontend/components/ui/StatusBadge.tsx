import type { EmailStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const styles: Record<EmailStatus, { chip: string; dot: string; label: string }> = {
  scheduled: { chip: "bg-blue-50 text-blue-700 ring-blue-600/15", dot: "bg-blue-500", label: "Scheduled" },
  processing: { chip: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500", label: "Sending" },
  sent: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500", label: "Sent" },
  failed: { chip: "bg-red-50 text-red-700 ring-red-600/15", dot: "bg-red-500", label: "Failed" },
};

export function StatusBadge({ status, title }: { status: EmailStatus; title?: string }) {
  const style = styles[status];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-medium ring-1 ring-inset",
        style.chip
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", style.dot, status === "processing" && "animate-pulse")}
      />
      {style.label}
    </span>
  );
}
