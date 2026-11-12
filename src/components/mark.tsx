"use client";

import Image from "next/image";
import {
  AirplaneTilt,
  BookOpen,
  Cake,
  CastleTurret,
  Coffee,
  Confetti,
  Crown,
  Envelope,
  Flower,
  ForkKnife,
  FrameCorners,
  Island,
  Palette,
  GameController,
  Gift,
  Heart,
  HouseLine,
  Moon,
  Sparkle,
  Tent,
  Waves,
  Notebook,
  PawPrint,
  ShoppingBag,
  Star,
  Ticket,
  UserCircle,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const STICKER_WEIGHT = "duotone" as const;

type MarkDef = {
  key: string;
  label: string;
  groups: Array<"space" | "project">;
  legacy: string[];
  icon: Icon;
  well: string;
  ink: string;
};

const MARKS: MarkDef[] = [
  { key: "heart", label: "心意", groups: ["space"], legacy: ["💛", "🤍", "❤️", "💕", "💖"], icon: Heart, well: "bg-pink-50", ink: "text-pink-500" },
  { key: "flower", label: "花", groups: ["space"], legacy: ["🌸", "🌷", "🌼", "💐"], icon: Flower, well: "bg-rose-100", ink: "text-rose-500" },
  { key: "house", label: "家", groups: ["space", "project"], legacy: ["🏠"], icon: HouseLine, well: "bg-amber-100", ink: "text-amber-700" },
  { key: "plane", label: "旅遊", groups: ["space", "project"], legacy: ["✈️"], icon: AirplaneTilt, well: "bg-sky-100", ink: "text-sky-600" },
  { key: "moon", label: "月亮", groups: ["space"], legacy: ["🌙"], icon: Moon, well: "bg-purple-100", ink: "text-purple-500" },
  { key: "coffee", label: "咖啡", groups: ["space"], legacy: ["☕"], icon: Coffee, well: "bg-amber-50", ink: "text-amber-800" },
  { key: "paw", label: "寵物", groups: ["space"], legacy: ["🐶", "🐱", "🐾"], icon: PawPrint, well: "bg-orange-50", ink: "text-orange-700" },
  { key: "cake", label: "甜點", groups: ["space", "project"], legacy: ["🍰", "🎂"], icon: Cake, well: "bg-pink-100", ink: "text-pink-500" },
  { key: "wave", label: "海邊", groups: ["space"], legacy: ["🌊"], icon: Waves, well: "bg-sky-100", ink: "text-sky-600" },
  { key: "camp", label: "露營", groups: ["space"], legacy: ["🏕️"], icon: Tent, well: "bg-emerald-50", ink: "text-emerald-700" },
  { key: "gift", label: "禮物", groups: ["space"], legacy: ["🎁"], icon: Gift, well: "bg-rose-100", ink: "text-rose-500" },
  { key: "sparkle", label: "閃亮", groups: ["space"], legacy: ["✨"], icon: Sparkle, well: "bg-amber-50", ink: "text-amber-600" },
  { key: "book", label: "書", groups: ["space"], legacy: ["📚"], icon: BookOpen, well: "bg-emerald-50", ink: "text-emerald-700" },
  { key: "game", label: "遊戲", groups: ["space"], legacy: ["🎮"], icon: GameController, well: "bg-sky-50", ink: "text-sky-700" },
  { key: "building", label: "住宿", groups: ["project"], legacy: ["🏨"], icon: CastleTurret, well: "bg-amber-100", ink: "text-amber-700" },
  { key: "shopping", label: "購物", groups: ["project"], legacy: ["🛒"], icon: ShoppingBag, well: "bg-emerald-100", ink: "text-emerald-600" },
  { key: "party", label: "派對", groups: ["project"], legacy: ["🎉"], icon: Confetti, well: "bg-pink-100", ink: "text-pink-500" },
  { key: "utensils", label: "用餐", groups: ["project"], legacy: ["🍽️"], icon: ForkKnife, well: "bg-rose-100", ink: "text-rose-600" },
  { key: "note", label: "記事", groups: ["project"], legacy: ["📝"], icon: Notebook, well: "bg-amber-50", ink: "text-amber-700" },
];

const GIFT_MARKS: Record<string, { icon: Icon; well: string; ink: string }> = {
  pat: { icon: PawPrint, well: "bg-orange-50", ink: "text-orange-700" },
  boba: { icon: Coffee, well: "bg-amber-100", ink: "text-amber-700" },
  hug: { icon: Heart, well: "bg-pink-100", ink: "text-pink-500" },
  star: { icon: Star, well: "bg-amber-100", ink: "text-amber-600" },
  cocoa: { icon: Coffee, well: "bg-amber-50", ink: "text-amber-800" },
  bouquet: { icon: Flower, well: "bg-rose-100", ink: "text-rose-500" },
  fireworks: { icon: Sparkle, well: "bg-purple-100", ink: "text-purple-500" },
  letter: { icon: Envelope, well: "bg-sky-100", ink: "text-sky-600" },
  sakura: { icon: Flower, well: "bg-pink-100", ink: "text-pink-500" },
  frame: { icon: FrameCorners, well: "bg-emerald-50", ink: "text-emerald-700" },
};

const TAG_MARKS: Array<{ test: RegExp; icon: Icon; well: string; ink: string; pill: string }> = [
  { test: /景點|私房/, icon: Island, well: "bg-white/80", ink: "text-teal-700", pill: "bg-teal-100 text-teal-700" },
  { test: /展覽/, icon: Palette, well: "bg-white/80", ink: "text-violet-600", pill: "bg-violet-100 text-violet-600" },
  { test: /機票|行程|✈️/, icon: AirplaneTilt, well: "bg-white/80", ink: "text-sky-600", pill: "bg-sky-100 text-sky-600" },
  { test: /酒店|住宿|🏨/, icon: CastleTurret, well: "bg-white/80", ink: "text-amber-700", pill: "bg-amber-100 text-amber-700" },
  { test: /門票|🎫/, icon: Ticket, well: "bg-white/80", ink: "text-purple-600", pill: "bg-purple-100 text-purple-600" },
  { test: /餐|美食|探店|🍽️/, icon: ForkKnife, well: "bg-white/80", ink: "text-rose-600", pill: "bg-rose-100 text-rose-600" },
  { test: /購物|🛒/, icon: ShoppingBag, well: "bg-white/80", ink: "text-emerald-600", pill: "bg-emerald-100 text-emerald-600" },
];

const AVATAR_WELLS = [
  "bg-pink-100 text-pink-600",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-600",
  "bg-sky-100 text-sky-700",
];

const SIZES = {
  xs: { box: "h-6 w-6 rounded-xl", icon: "h-3.5 w-3.5", text: "text-[10px]" },
  sm: { box: "h-8 w-8 rounded-2xl", icon: "h-4 w-4", text: "text-xs" },
  md: { box: "h-10 w-10 rounded-2xl", icon: "h-5 w-5", text: "text-sm" },
  lg: { box: "h-16 w-16 rounded-3xl", icon: "h-8 w-8", text: "text-2xl" },
} as const;

const STICKER_SHADOW = "shadow-[0_4px_12px_rgba(0,0,0,0.05)]";

export type MarkSize = keyof typeof SIZES;

function marksFor(kind: "space" | "project") {
  return MARKS.filter((item) => item.groups.includes(kind));
}

export function spaceMarks() {
  return marksFor("space");
}

export function projectMarks() {
  return marksFor("project");
}

export function findMark(value: string | null | undefined, kind: "space" | "project" = "space") {
  const raw = (value ?? "").trim();
  const pool = marksFor(kind);
  const found =
    pool.find((item) => item.key === raw || item.legacy.includes(raw)) ??
    MARKS.find((item) => item.key === raw || item.legacy.includes(raw));
  if (found) return found;
  return kind === "project" ? (MARKS.find((item) => item.key === "note") ?? MARKS[0]) : MARKS[0];
}

export function markKey(value: string | null | undefined, kind: "space" | "project" = "space") {
  return findMark(value, kind).key;
}

export function matchSpaceIcon(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw || isAvatarPhoto(raw)) return null;
  return (
    MARKS.find((item) => item.groups.includes("space") && (item.key === raw || item.legacy.includes(raw))) ??
    MARKS.find((item) => item.key === raw || item.legacy.includes(raw)) ??
    null
  );
}

function isEmojiGlyph(value: string) {
  return /\p{Extended_Pictographic}/u.test(value);
}

export function SpaceMark({
  emoji,
  photo,
  name,
  size = "md",
  className,
}: {
  emoji?: string | null;
  photo?: string | null;
  name?: string;
  size?: MarkSize;
  className?: string;
}) {
  const box = SIZES[size];
  const portrait = isAvatarPhoto(photo) ? photo?.trim() : null;
  if (portrait) {
    return (
      <span
        className={cn("block shrink-0 bg-cover bg-center", STICKER_SHADOW, box.box, className)}
        style={{ backgroundImage: `url("${portrait.replace(/["\\]/g, "")}")` }}
        aria-hidden
      />
    );
  }
  const mark = matchSpaceIcon(emoji);
  if (mark) {
    const Icon = mark.icon;
    return (
      <span className={cn("grid shrink-0 place-items-center", STICKER_SHADOW, mark.well, mark.ink, box.box, className)} aria-hidden>
        <Icon className={box.icon} weight={STICKER_WEIGHT} />
      </span>
    );
  }
  const raw = (emoji ?? "").trim();
  if (raw && isEmojiGlyph(raw)) {
    return (
      <span className={cn("grid shrink-0 place-items-center bg-white", STICKER_SHADOW, box.box, box.text, className)} aria-hidden>
        {raw}
      </span>
    );
  }
  const letter = [...(name ?? "").trim()][0];
  if (letter) {
    return (
      <span className={cn("grid shrink-0 place-items-center bg-blush font-semibold text-ink", STICKER_SHADOW, box.box, box.text, className)} aria-hidden>
        {letter}
      </span>
    );
  }
  return (
    <span className={cn("relative block shrink-0 overflow-hidden bg-[#f6e3dc]", STICKER_SHADOW, box.box, className)} aria-hidden>
      <Image src="/planwith-logo.png" alt="" fill sizes="64px" className="object-cover" />
    </span>
  );
}

export function IconWell({
  value,
  kind = "space",
  size = "md",
  className,
}: {
  value?: string | null;
  kind?: "space" | "project";
  size?: MarkSize;
  className?: string;
}) {
  const mark = findMark(value, kind);
  const Icon = mark.icon;
  const box = SIZES[size];
  return (
    <span
      className={cn("grid shrink-0 place-items-center", STICKER_SHADOW, mark.well, mark.ink, box.box, className)}
      aria-hidden
    >
      <Icon className={box.icon} weight={STICKER_WEIGHT} />
    </span>
  );
}

export function GiftWell({ id, size = "md", className }: { id: string; size?: MarkSize; className?: string }) {
  const mark = GIFT_MARKS[id] ?? { icon: Gift, well: "bg-pink-100", ink: "text-pink-500" };
  const Icon = mark.icon;
  const box = SIZES[size];
  return (
    <span className={cn("grid shrink-0 place-items-center", STICKER_SHADOW, mark.well, mark.ink, box.box, className)} aria-hidden>
      <Icon className={box.icon} weight={STICKER_WEIGHT} />
    </span>
  );
}

export function isAvatarPhoto(value: string | null | undefined) {
  return /^https?:\/\//i.test((value ?? "").trim());
}

export function matchMark(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw || isAvatarPhoto(raw)) return null;
  return MARKS.find((item) => item.key === raw || item.legacy.includes(raw)) ?? null;
}

export function AvatarBadge({
  name,
  mark,
  size = "md",
  className,
}: {
  name: string;
  mark?: string | null;
  size?: MarkSize;
  className?: string;
}) {
  const box = SIZES[size];
  const photo = isAvatarPhoto(mark) ? mark?.trim() : null;
  if (photo) {
    return (
      <span
        className={cn("block shrink-0 bg-cover bg-center", STICKER_SHADOW, box.box, className)}
        style={{ backgroundImage: `url("${photo.replace(/["\\]/g, "")}")` }}
        aria-hidden
      />
    );
  }
  const found = matchMark(mark);
  if (found) {
    const Icon = found.icon;
    return (
      <span
        className={cn("grid shrink-0 place-items-center", STICKER_SHADOW, found.well, found.ink, box.box, className)}
        aria-hidden
      >
        <Icon className={box.icon} weight={STICKER_WEIGHT} />
      </span>
    );
  }
  const trimmed = name.trim();
  const letter = [...trimmed][0]?.toLocaleUpperCase("en-US") ?? "";
  if (!letter || trimmed === "未指派") {
    return (
      <span
        className={cn("grid shrink-0 place-items-center bg-amber-50 text-amber-700", STICKER_SHADOW, box.box, className)}
        aria-hidden
      >
        <UserCircle className={box.icon} weight={STICKER_WEIGHT} />
      </span>
    );
  }
  let hash = 0;
  for (const char of trimmed) hash = (hash + char.charCodeAt(0)) % AVATAR_WELLS.length;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center font-semibold",
        STICKER_SHADOW,
        AVATAR_WELLS[hash],
        box.box,
        box.text,
        className,
      )}
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function RoleBadge({ owner }: { owner: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      {owner ? <Crown className="h-3.5 w-3.5 text-amber-500" weight={STICKER_WEIGHT} /> : null}
      {owner ? "創作者" : "成員"}
    </span>
  );
}

export function tagLabel(tag: string) {
  return tag.replace(/^(?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+\s*/u, "") || tag;
}

export function TagChip({ tag, className }: { tag: string; className?: string }) {
  const visual = TAG_MARKS.find((item) => item.test.test(tag));
  const Icon = visual?.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
        visual?.pill ?? "bg-amber-50 text-amber-800",
        className,
      )}
    >
      {Icon ? (
        <span className={cn("grid h-5 w-5 place-items-center rounded-lg", visual.well, visual.ink)}>
          <Icon className="h-3.5 w-3.5" weight={STICKER_WEIGHT} />
        </span>
      ) : null}
      {tagLabel(tag)}
    </span>
  );
}
