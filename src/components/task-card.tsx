"use client";

import { ArrowSquareOut, Check, Circle, Image as ImageIcon, Lifebuoy, ChatCircle, Play } from "@phosphor-icons/react";
import { AvatarBadge, GiftWell, TagChip } from "@/components/mark";
import type { Reward, Task, TaskStatus } from "@/lib/types";
import { cn, formatDue, isOverdue, PRIORITY_META, STATUS_META } from "@/lib/utils";
import { useApp } from "@/components/app-provider";
import { TaskImage } from "@/components/task-extras";

const STATUS_ICON = {
  todo: Circle,
  in_progress: Play,
  stuck: Lifebuoy,
  completed: Check,
} as const;

export function TaskCard({
  task,
  gifts,
  commentCount,
  onOpen,
  onStatus,
  onReward,
}: {
  task: Task;
  gifts: Reward[];
  commentCount: number;
  onOpen: () => void;
  onStatus: (status: TaskStatus) => void;
  onReward: () => void;
}) {
  const { person } = useApp();
  const assignee = person(task.assignee_id);
  const stuck = task.status === "stuck";
  const done = task.status === "completed";
  const shownGifts = gifts.slice(0, 3);

  return (
    <article
      className={cn(
        "rounded-3xl border bg-foam p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
        stuck ? "stuck-pulse border-rose bg-stuck-bg" : "border-white",
        done && "bg-leaf/40",
      )}
    >
      <button type="button" onClick={onOpen} className="w-full text-left">
        <span className="flex items-center gap-2 text-[11px] font-semibold text-cocoa">
          <span className={cn("h-2 w-2 rounded-full", PRIORITY_META[task.priority].dot)} />
          {PRIORITY_META[task.priority].label}
          {stuck ? <span className="rounded-full bg-stuck px-2 py-0.5 text-white">需要幫忙</span> : null}
        </span>
        <span className={cn("mt-1.5 block break-words font-semibold leading-6", done && "text-cocoa line-through decoration-sage")}>
          {task.title}
        </span>
        {task.description ? (
          <span className="mt-1 line-clamp-2 block text-sm leading-5 text-cocoa">{task.description}</span>
        ) : null}
        {task.tags.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag} tag={tag} className="text-[11px] font-semibold" />
            ))}
            {task.tags.length > 3 ? (
              <span className="rounded-full bg-linen px-2 py-0.5 text-[11px] font-semibold text-cocoa">
                +{task.tags.length - 3}
              </span>
            ) : null}
          </span>
        ) : null}
        {stuck && task.stuck_note ? (
          <span className="mt-2 block rounded-2xl bg-white/80 px-3 py-2 text-sm leading-5 text-stuck">
            {task.stuck_note}
          </span>
        ) : null}
        {task.image_urls.length > 0 ? (
          <span className="mt-2 flex items-center gap-2">
            <TaskImage src={task.image_urls[0] ?? ""} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            {task.image_urls.length > 1 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cocoa">
                <ImageIcon className="h-3.5 w-3.5" weight="bold" />
                {task.image_urls.length} 張
              </span>
            ) : null}
          </span>
        ) : null}
        <span className="mt-3 flex items-center justify-between gap-2 text-xs text-cocoa">
          <span className="inline-flex items-center gap-1.5">
            <AvatarBadge name={task.assignee_id ? assignee.name : "未指派"} mark={task.assignee_id ? assignee.emoji : null} size="xs" />
            {task.assignee_id ? assignee.name : "未指派"}
          </span>
          <span className={cn(isOverdue(task.due_date, task.status) && "font-semibold text-stuck")}>
            {formatDue(task.due_date, task.status)}
          </span>
        </span>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="更改狀態">
          {(Object.keys(STATUS_ICON) as TaskStatus[]).map((status) => {
            const Icon = STATUS_ICON[status];
            const active = task.status === status;
            return (
              <button
                key={status}
                type="button"
                aria-label={`改成${STATUS_META[status].label}`}
                aria-pressed={active}
                onClick={() => onStatus(status)}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full transition",
                  active && status === "stuck" && "bg-stuck text-white",
                  active && status === "completed" && "bg-sage-deep text-white",
                  active && status === "in_progress" && "bg-leaf text-sage-deep",
                  active && status === "todo" && "bg-sand text-ink",
                  !active && "text-mist hover:bg-linen hover:text-cocoa",
                )}
              >
                <Icon className="h-3.5 w-3.5" weight="bold" />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-mist">
          {task.link_url ? (
            <a
              href={task.link_url}
              target="_blank"
              rel="noreferrer"
              aria-label="開啟預訂連結"
              className="inline-flex items-center gap-1 font-semibold text-coral hover:text-coral-deep"
            >
              <ArrowSquareOut className="h-3.5 w-3.5" weight="bold" />
              連結
            </a>
          ) : null}
          {commentCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <ChatCircle className="h-3.5 w-3.5" weight="bold" />
              {commentCount}
            </span>
          ) : null}
          {shownGifts.length > 0 ? (
            <span className="inline-flex items-center gap-1" aria-label="已收到的獎勵">
              {shownGifts.map((gift) => (
                <GiftWell key={gift.id} id={gift.catalog_id} size="xs" />
              ))}
            </span>
          ) : null}
          {done ? (
            <button type="button" onClick={onReward} className="font-semibold text-coral hover:text-coral-deep">
              送獎勵
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
