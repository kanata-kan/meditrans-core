import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/* ── Column definition ── */
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

/* ── Pagination ── */
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/* ── Table props ── */
interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  pagination?: PaginationProps;
  className?: string;
  onRowClick?: (row: T) => void;
}

/* ── Loading skeleton ── */
function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-surface-muted rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ── Empty state ── */
function EmptyState({ message, cols }: { message: string; cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-12 text-text-muted text-sm">
        {message}
      </td>
    </tr>
  );
}

/* ── Main component ── */
export function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = "Aucune donnée disponible",
  pagination,
  className,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className={cn("bg-surface border border-border rounded-lg shadow-xs overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-light border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <SkeletonRows cols={columns.length} />
            ) : data.length === 0 ? (
              <EmptyState message={emptyMessage} cols={columns.length} />
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-surface-light",
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 text-text-primary", col.className)}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-light">
          <span className="text-xs text-text-muted">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-md border border-border text-text-secondary hover:bg-surface-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Page précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-md border border-border text-text-secondary hover:bg-surface-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Page suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
