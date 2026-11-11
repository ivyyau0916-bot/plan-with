import * as React from "react";
import { cn } from "@/lib/utils";

export const controlClass =
  "w-full rounded-2xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-mist focus:border-rose";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlClass, "min-h-24 resize-none", className)} {...props} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-3 text-sm font-medium text-cocoa">
        {label}
        {hint ? <span className="text-xs font-normal text-mist">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
