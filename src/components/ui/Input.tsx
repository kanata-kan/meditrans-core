import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, startIcon, endIcon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-9 px-3 text-sm bg-surface border border-border rounded-md",
              "text-text-primary placeholder:text-text-muted",
              "transition-colors duration-150",
              "hover:border-border-strong",
              "focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-status-danger focus:ring-status-danger/20 focus:border-status-danger",
              startIcon && "pl-9",
              endIcon && "pr-9",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {endIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {endIcon}
            </span>
          )}
        </div>
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

Input.displayName = "Input";
