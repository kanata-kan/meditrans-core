import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-muted text-text-secondary",
  success: "bg-status-success-soft text-status-success",
  warning: "bg-status-warning-soft text-status-warning",
  danger: "bg-status-danger-soft text-status-danger",
  info: "bg-status-info-soft text-status-info",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Convenience: map MediTrans statuses to badge variants ── */

const invoiceStatusMap: Record<string, BadgeVariant> = {
  unpaid: "warning",
  partial: "info",
  paid: "success",
  cancelled: "danger",
};

const serviceStatusMap: Record<string, BadgeVariant> = {
  pending: "warning",
  in_progress: "info",
  completed: "success",
  cancelled: "danger",
};

export function statusToBadgeVariant(
  status: string,
  type: "invoice" | "service" = "invoice",
): BadgeVariant {
  const map = type === "invoice" ? invoiceStatusMap : serviceStatusMap;
  return map[status] ?? "default";
}
