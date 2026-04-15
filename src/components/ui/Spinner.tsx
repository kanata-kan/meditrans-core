import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-[2px]",
  md: "h-5 w-5 border-2",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-current border-r-transparent animate-spin",
        sizeMap[size],
        className,
      )}
      role="status"
      aria-label="Chargement"
    />
  );
}
