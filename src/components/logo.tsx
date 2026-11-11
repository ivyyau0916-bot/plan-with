import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-left">
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-[22%] shadow-sm",
          large ? "h-16 w-16" : "h-12 w-12",
        )}
      >
        <Image src="/planwith-logo.png" alt="" fill priority sizes="64px" className="object-cover" />
      </span>
      <span>
        <h1 className={cn("font-display font-bold leading-tight text-ink", large ? "text-3xl" : "text-lg")}>PlanWith</h1>
        <span className="mt-0.5 block text-xs text-cocoa">約定清單</span>
      </span>
    </div>
  );
}
