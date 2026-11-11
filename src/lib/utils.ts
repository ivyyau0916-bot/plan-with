import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Priority, TaskStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  return crypto.randomUUID();
}

export function normalizeInviteCode(input: string) {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length === 6) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return input.trim().toUpperCase();
}

export function makeInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let letters = "";
  for (let i = 0; i < 3; i += 1) {
    letters += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const number = 100 + Math.floor(Math.random() * 900);
  return `${letters}-${number}`;
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function formatDue(date: string | null, status: TaskStatus) {
  if (!date) return "沒有期限";
  const due = new Date(`${date}T00:00:00`);
  const diff = Math.round((due.getTime() - startOfToday().getTime()) / 86_400_000);
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === -1) return "昨天";
  if (diff < 0 && status !== "completed") return `逾期 ${Math.abs(diff)} 天`;
  return `${due.getMonth() + 1}/${due.getDate()}`;
}

export function isOverdue(date: string | null, status: TaskStatus) {
  if (!date || status === "completed") return false;
  const due = new Date(`${date}T00:00:00`);
  return due.getTime() < startOfToday().getTime();
}

export function formatWhen(iso: string) {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} 天前`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function dayOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

export const STATUS_META: Record<
  TaskStatus,
  { label: string; hint: string; action: string }
> = {
  todo: { label: "待辦", hint: "約好了，還沒開始", action: "待辦" },
  in_progress: { label: "進行中", hint: "有人正在處理", action: "進行中" },
  stuck: { label: "卡住了", hint: "需要對方拉一把", action: "卡住" },
  completed: { label: "完成", hint: "可以送一份小獎勵", action: "完成" },
};

export const PRIORITY_META: Record<Priority, { label: string; dot: string }> = {
  low: { label: "慢慢來", dot: "bg-sage" },
  medium: { label: "普通", dot: "bg-[#e2b15a]" },
  high: { label: "急事", dot: "bg-coral" },
};

export const SPACE_ACCENTS = [
  { id: "blush", label: "粉", className: "bg-blush" },
  { id: "sage", label: "綠", className: "bg-sage" },
  { id: "sand", label: "米", className: "bg-sand" },
  { id: "lilac", label: "紫", className: "bg-[#e4d4ef]" },
  { id: "gold", label: "杏", className: "bg-[#f3d7a1]" },
] as const;

export function accentClass(accent: string | null | undefined) {
  return SPACE_ACCENTS.find((item) => item.id === accent)?.className ?? "bg-blush";
}

export function mapAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("anonymous")) {
    return "這個專案還沒開啟匿名登入。可以改用信箱註冊，或到 Supabase Authentication 打開 Anonymous sign-ins。";
  }
  if (lower.includes("invalid login")) return "帳號或密碼不對";
  if (lower.includes("email not confirmed")) return "請先到信箱點確認信，再回來登入";
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "這個信箱已經註冊過了，直接登入就好";
  }
  if (lower.includes("password")) return "密碼至少需要 6 個字元";
  if (lower.includes("valid email") || lower.includes("unable to validate email")) {
    return "信箱格式好像不太對";
  }
  return message || "剛剛沒有成功，再試一次";
}

export function errorMessage(error: unknown, fallback = "剛剛沒有成功，再試一次") {
  return error instanceof Error && error.message ? error.message : fallback;
}
