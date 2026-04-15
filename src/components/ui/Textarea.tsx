import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, rows = 4, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            "w-full px-3 py-2 text-sm bg-surface border border-border rounded-md resize-y",
            "text-text-primary placeholder:text-text-muted",
            "transition-colors duration-150",
            "hover:border-border-strong",
            "focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-status-danger focus:ring-status-danger/20 focus:border-status-danger",
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-status-danger">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-text-muted">{helperText}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
