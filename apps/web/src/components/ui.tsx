"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/** Design system "Crema & Tinta": píldoras de tinta, superficies de papel. */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink-900 text-cream-50 shadow-[0_10px_28px_-10px_rgba(32,27,18,0.55)] hover:bg-ink-700 hover:-translate-y-0.5",
  secondary:
    "bg-transparent text-ink-900 border-2 border-ink-900/20 hover:border-ink-900 hover:-translate-y-0.5",
  ghost: "bg-transparent text-ink-500 hover:bg-cream-100 hover:text-ink-900",
  danger: "bg-rose-500 text-cream-50 hover:bg-rose-600 hover:-translate-y-0.5",
  success:
    "bg-emerald-500 text-cream-50 shadow-[0_10px_28px_-10px_rgba(140,181,115,0.7)] hover:bg-emerald-600 hover:-translate-y-0.5",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-2.5 text-base",
  lg: "px-8 py-3.5 text-lg",
  xl: "px-10 py-4 text-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-display font-bold tracking-tight",
        "transition-all duration-200 active:scale-[0.96] active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-5",
        "shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border-2 border-cream-300 bg-[#fffdf6] px-4 py-3 text-lg text-ink-900",
        "placeholder:text-ink-300 transition-colors focus:border-ink-900 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function ProgressBar({
  value,
  max,
  className,
  barClassName,
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn("h-3 overflow-hidden rounded-full bg-ink-900/8", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-brand-500 transition-all duration-700 ease-out",
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-cream-100 px-3 py-1 text-sm font-bold text-ink-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-ink-400">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-cream-200 border-t-ink-900" />
        <div className="absolute inset-0 flex items-center justify-center text-lg">🧠</div>
      </div>
      {label && <p className="font-display text-sm font-bold">{label}</p>}
    </div>
  );
}

export function EmptyState({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <span className="animate-wiggle text-5xl">{emoji}</span>
      <p className="font-display text-lg font-bold text-ink-700">{title}</p>
      {hint && <p className="text-sm font-semibold text-ink-400">{hint}</p>}
    </div>
  );
}
