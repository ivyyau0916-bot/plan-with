"use client";

import { TaskCard } from "@/components/task-card";
import { useApp } from "@/components/app-provider";
import type { Task, TaskStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/utils";

const COLUMNS: { id: TaskStatus; wash: string }[] = [
  { id: "todo", wash: "bg-white/45" },
  { id: "in_progress", wash: "bg-leaf/70" },
  { id: "stuck", wash: "bg-stuck-bg/80" },
  { id: "completed", wash: "bg-white/35" },
];

function sortColumn(tasks: Task[], status: TaskStatus) {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    if (status === "completed") return (b.completed_at ?? "").localeCompare(a.completed_at ?? "");
    const byPriority = rank[a.priority] - rank[b.priority];
    if (byPriority !== 0) return byPriority;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function TaskBoard({
  filter,
  tag,
  query,
  onOpen,
  onStatus,
  onReward,
}: {
  filter: "all" | "mine" | "stuck";
  tag: string;
  query: string;
  onOpen: (taskId: string) => void;
  onStatus: (task: Task, status: TaskStatus) => void;
  onReward: (taskId: string) => void;
}) {
  const { tasks, comments, rewards, me } = useApp();
  const needle = query.trim().toLowerCase();
  const narrowed = Boolean(needle) || tag !== "all";
  const visible = tasks.filter((task) => {
    if (filter === "mine" && task.assignee_id !== me?.id) return false;
    if (filter === "stuck" && task.status !== "stuck") return false;
    if (tag !== "all" && !task.tags.includes(tag)) return false;
    if (!needle) return true;
    return (
      task.title.toLowerCase().includes(needle) ||
      task.tags.some((item) => item.toLowerCase().includes(needle))
    );
  });

  return (
    <div className="grid w-full grid-cols-1 gap-3 pb-8 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((column) => {
        const columnTasks = sortColumn(
          visible.filter((task) => task.status === column.id),
          column.id,
        );
        return (
          <section key={column.id} className={`min-w-0 rounded-3xl p-3 ${column.wash}`}>
            <header className="mb-3 flex items-baseline justify-between px-1">
              <div>
                <h2 className="font-semibold">{STATUS_META[column.id].label}</h2>
                <p className="text-xs text-mist">{STATUS_META[column.id].hint}</p>
              </div>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-cocoa">
                {columnTasks.length}
              </span>
            </header>
            <div className="space-y-3">
              {columnTasks.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-sand px-3 py-6 text-center text-sm text-mist">
                  {narrowed ? "沒有符合的任務" : "這裡還空空的"}
                </p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    gifts={rewards.filter((reward) => reward.task_id === task.id)}
                    commentCount={comments.filter((comment) => comment.task_id === task.id).length}
                    onOpen={() => onOpen(task.id)}
                    onStatus={(status) => onStatus(task, status)}
                    onReward={() => onReward(task.id)}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
