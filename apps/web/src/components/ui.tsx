"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/** Componentes base estilo shadcn, adaptados a la estética kid-friendly. */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-600/20",
  secondary: "bg-white text-brand-700 border-2 border-brand-200 hover:border-brand-400",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-xl",
  md: "px-5 py-2.5 text-base rounded-2xl",
  lg: "px-7 py-3.5 text-lg rounded-2xl",
  xl: "px-9 py-4 text-xl rounded-3xl",
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
        "font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2",
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
    <div className={cn("bg-white rounded-3xl shadow-sm border border-slate-100 p-5", className)}>
      {children}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg focus:border-brand-500 focus:outline-none bg-white",
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
    <div className={cn("h-3 rounded-full bg-slate-100 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full bg-brand-500 transition-all duration-700", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 px-3 py-1 text-sm font-bold",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
      {label && <p className="text-sm font-semibold">{label}</p>}
    </div>
  );
}

export function EmptyState({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <span className="text-5xl">{emoji}</span>
      <p className="text-lg font-bold text-slate-600">{title}</p>
      {hint && <p className="text-sm text-slate-400">{hint}</p>}
    </div>
  );
}
