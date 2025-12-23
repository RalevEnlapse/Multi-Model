import * as React from "react";

import { classNames } from "./class-names";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "strong" }
>(function Card({ className, variant = "default", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={classNames(
        "rounded-2xl border shadow-sm backdrop-blur",
        variant === "strong"
          ? "border-zinc-800/80 bg-zinc-900/45"
          : "border-zinc-800/70 bg-zinc-900/30",
        className
      )}
      {...props}
    />
  );
});

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={classNames("flex items-center justify-between gap-3", className)} {...props} />;
  }
);

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return <h2 ref={ref} className={classNames("text-sm font-semibold text-zinc-200", className)} {...props} />;
  }
);

export const CardMeta = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  function CardMeta({ className, ...props }, ref) {
    return <span ref={ref} className={classNames("text-xs text-zinc-500", className)} {...props} />;
  }
);

export const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardBody({ className, ...props }, ref) {
    return <div ref={ref} className={classNames("p-4 sm:p-5", className)} {...props} />;
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, intent = "primary", size = "md", disabled, ...props },
  ref
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60";
  const sizing = size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm";
  const intentCls =
    intent === "primary"
      ? "bg-white text-zinc-950 hover:bg-zinc-200"
      : intent === "secondary"
        ? "border border-zinc-800 bg-zinc-950/30 text-zinc-100 hover:bg-zinc-900/40"
        : "text-zinc-200 hover:bg-zinc-900/35";

  return (
    <button
      ref={ref}
      className={classNames(base, sizing, intentCls, className)}
      disabled={disabled}
      {...props}
    />
  );
});

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={classNames(
        "h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/35 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25",
        className
      )}
      {...props}
    />
  );
});

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={classNames(
        "h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950/35 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25",
        className
      )}
      {...props}
    />
  );
});

export function Badge({
  children,
  tone = "zinc",
}: {
  children: React.ReactNode;
  tone?: "zinc" | "green" | "red" | "amber";
}) {
  const toneCls =
    tone === "green"
      ? "border-emerald-900/45 bg-emerald-950/35 text-emerald-200"
      : tone === "red"
        ? "border-red-900/50 bg-red-950/35 text-red-200"
        : tone === "amber"
          ? "border-amber-900/45 bg-amber-950/30 text-amber-200"
          : "border-zinc-800/70 bg-zinc-950/30 text-zinc-300";

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        toneCls
      )}
    >
      {children}
    </span>
  );
}
