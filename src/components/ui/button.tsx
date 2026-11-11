import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-coral text-white shadow-[0_4px_12px_rgba(201,106,92,0.28)] hover:bg-coral-deep",
        sage: "bg-sage-deep text-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:brightness-95",
        soft: "border border-sand bg-white text-ink shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-linen",
        ghost: "text-cocoa hover:bg-white/70",
        danger: "border border-blush bg-white text-stuck shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-stuck-bg",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
