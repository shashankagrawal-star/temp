import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Optional width utility class, e.g. "w-40". */
  width?: string;
  align?: "left" | "right";
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  skeletonRows = 6,
  empty,
}: Props<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden">
        <TableHead columns={columns} />
        <div className="divide-y divide-line">
          {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-4 px-5 py-3.5">
              {columns.map((col, colIndex) => (
                <div key={col.key} className={cn("flex-1", col.width)}>
                  <div
                    className="skeleton h-3.5 rounded"
                    style={{ width: colIndex === 0 ? "62%" : colIndex === 1 ? "78%" : "45%" }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas/50">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "px-5 py-2.5 text-2xs font-semibold uppercase tracking-wider text-ink-subtle",
                  col.align === "right" ? "text-right" : "text-left",
                  col.width
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-canvas/70">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-5 py-3.5 align-middle text-ink-muted",
                    col.align === "right" && "text-right"
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHead<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <div className="flex items-center gap-4 border-b border-line bg-canvas/50 px-5 py-2.5">
      {columns.map((col) => (
        <div
          key={col.key}
          className={cn(
            "flex-1 text-2xs font-semibold uppercase tracking-wider text-ink-subtle",
            col.width
          )}
        >
          {col.header}
        </div>
      ))}
    </div>
  );
}
