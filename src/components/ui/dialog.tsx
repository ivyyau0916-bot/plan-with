"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#3d322c]/35 backdrop-blur-[3px]" />
      <DialogPrimitive.Content
        className={cn(
          "dialog-rise fixed left-1/2 top-1/2 z-50 max-h-[min(90vh,820px)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-3xl border border-white/80 bg-foam p-5 shadow-[0_8px_28px_rgba(80,48,36,0.12)] focus:outline-none sm:p-6",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-cocoa transition hover:bg-linen hover:text-ink"
          aria-label="關閉"
        >
          <X className="h-4 w-4" weight="bold" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
