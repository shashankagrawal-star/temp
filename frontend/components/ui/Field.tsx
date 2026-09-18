"use client";

import {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  useId,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink shadow-sm transition-colors " +
  "placeholder:text-ink-subtle hover:border-ink-subtle/60 " +
  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 " +
  "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-subtle";

interface LabelWrapProps {
  label?: string;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}

function LabelWrap({ label, hint, error, htmlFor, children }: LabelWrapProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <LabelWrap label={label} hint={hint} error={error} htmlFor={inputId}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(control, "h-[38px]", error && "border-red-400 focus:border-red-500 focus:ring-red-500/20", className)}
        {...props}
      />
    </LabelWrap>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <LabelWrap label={label} hint={hint} error={error} htmlFor={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(control, "resize-y py-2 leading-relaxed", error && "border-red-400", className)}
        {...props}
      />
    </LabelWrap>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <LabelWrap label={label} hint={hint} error={error} htmlFor={inputId}>
      <select
        ref={ref}
        id={inputId}
        className={cn(control, "h-[38px] appearance-none bg-no-repeat pr-9", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%238c97a8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 10px center",
        }}
        {...props}
      >
        {children}
      </select>
    </LabelWrap>
  );
});
