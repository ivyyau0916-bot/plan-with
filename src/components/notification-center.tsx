"use client";

import { Alarm, Bell, Gift, PencilSimple, Plus } from "@phosphor-icons/react";
import { useState, useSyncExternalStore } from "react";
import { useApp } from "@/components/app-provider";
import { dueHorizon, duePhrase } from "@/lib/due";
import type { AppNotification, NotificationType } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";

const TYPE_MARK: Record<NotificationType, { icon: typeof Bell; well: string; ink: string }> = {
  new_task: { icon: Plus, well: "bg-sky-100", ink: "text-sky-600" },
  task_update: { icon: PencilSimple, well: "bg-amber-100", ink: "text-amber-700" },
  due_soon: { icon: Alarm, well: "bg-rose-100", ink: "text-rose-500" },
  gift: { icon: Gift, well: "bg-pink-100", ink: "text-pink-500" },
};

export function NotificationBell({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const { notifications, markNotificationsRead, focusTask, setActiveSpace } = useApp();
  const [open, setOpen] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const now = useClock();
  const unread = notifications.filter((note) => !note.is_read).length;

  async function openNote(note: AppNotification) {
    setNoteError(null);
    try {
      if (!note.is_read) await markNotificationsRead([note.id]);
      setOpen(false);
      if (note.task_id) {
        focusTask(note.task_id);
        onOpenTask(note.task_id);
      } else if (note.space_id) {
        setActiveSpace(note.space_id);
      }
    } catch (error) {
      setNoteError(errorMessage(error));
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `通知中心，${unread} 則未讀` : "通知中心"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-cocoa shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
      >
        <Bell className="h-5 w-5" weight="bold" />
        {unread > 0 ? <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#ff6b8a] ring-2 ring-cream" /> : null}
      </button>
      {open ? (
        <>
          <button type="button" aria-label="關閉通知" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/80 bg-foam p-3 shadow-[0_8px_28px_rgba(80,48,36,0.12)]">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-bold text-ink">通知中心</p>
              <button
                type="button"
                className="text-xs font-semibold text-coral disabled:text-mist"
                disabled={unread === 0}
                onClick={() => void markNotificationsRead("all").catch((error: unknown) => setNoteError(errorMessage(error)))}
              >
                全部標為已讀
              </button>
            </div>
            {noteError ? <p className="mt-2 px-1 text-xs text-stuck">{noteError}</p> : null}
            <div className="mt-2 max-h-80 space-y-1 overflow-y-auto scroll-soft">
              {notifications.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-cocoa">目前沒有通知</p>
              ) : (
                notifications.map((note) => {
                  const mark = TYPE_MARK[note.type] ?? TYPE_MARK.task_update;
                  const Icon = mark.icon;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => void openNote(note)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-2xl px-2 py-2 text-left hover:bg-linen",
                        note.is_read ? "opacity-70" : "bg-white",
                      )}
                    >
                      <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-2xl", mark.well, mark.ink)}>
                        <Icon className="h-4 w-4" weight="duotone" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{note.title}</span>
                          {note.is_read ? null : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6b8a]" />}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-cocoa">{note.message}</span>
                        <span className="mt-0.5 block text-[11px] text-mist">{relativeTime(note.created_at, now)}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function DueSoonBanner({ onOpen }: { onOpen: (taskId: string) => void }) {
  const { spaceTasks } = useApp();
  const today = useSyncExternalStore(subscribeClock, todayStamp, () => "");
  if (!today) return null;
  const soon = spaceTasks.filter((task) => task.status !== "completed" && dueHorizon(task.due_date));
  if (soon.length === 0) return null;
  return (
    <div className="mb-4 space-y-2">
      {soon.slice(0, 2).map((task) => {
        const kind = dueHorizon(task.due_date);
        if (!kind) return null;
        return (
          <button
            key={task.id}
            type="button"
            onClick={() => onOpen(task.id)}
            className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-rose bg-stuck-bg/70 px-4 py-3 text-left shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-500">
              <Alarm className="h-5 w-5" weight="duotone" />
            </span>
            <span className="text-sm leading-6 text-ink">
              「{task.title}」將於{duePhrase(kind)}到期，快去完成吧！
            </span>
          </button>
        );
      })}
    </div>
  );
}

function subscribeClock() {
  return () => undefined;
}

let cachedNow = 0;
let cachedStamp = "";

function todayStamp() {
  if (!cachedStamp) {
    const now = new Date();
    cachedStamp = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  }
  return cachedStamp;
}

function useClock() {
  return useSyncExternalStore(
    subscribeClock,
    () => {
      if (cachedNow === 0) cachedNow = Date.now();
      return cachedNow;
    },
    () => 0,
  );
}

function relativeTime(iso: string, now: number) {
  if (!now) return "";
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.round(hours / 24);
  return days === 1 ? "昨天" : `${days} 天前`;
}
