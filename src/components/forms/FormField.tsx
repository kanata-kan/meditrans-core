import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  helperText,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-text-primary"
      >
        {label}
        {required && <span className="text-status-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-status-danger">{error}</p>
      )}
      {!error && helperText && (
        <p className="text-xs text-text-muted">{helperText}</p>
      )}
    </div>
  );
}
