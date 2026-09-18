import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300 disabled:shadow-none",
  secondary:
    "bg-surface text-ink border border-line shadow-sm hover:bg-canvas active:bg-line/60 disabled:text-ink-subtle",
  ghost: "text-ink-muted hover:bg-line/50 hover:text-ink active:bg-line",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:bg-red-300",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9.5 px-4 text-sm gap-2 rounded-lg",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading = false, icon, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-150",
        "disabled:cursor-not-allowed",
        sizes[size],
        variants[variant],
        size === "md" && "h-[38px]",
        className
      )}
      {...props}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : icon}
      {children}
    </button>
  );
});
