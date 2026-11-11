"use client";

import { Broadcast, Copy, Flower, Gear, Lightbulb, List, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { AppProvider, useApp } from "@/components/app-provider";
import { Logo } from "@/components/logo";
import { AuthScreen } from "@/components/auth-screen";
import { ReelsLibrary } from "@/components/reels-library";
import { RewardDialog } from "@/components/reward-dialog";
import { Sidebar } from "@/components/sidebar";
import { CreateSpaceDialog, JoinSpaceDialog, SpaceSettingsDialog } from "@/components/space-dialogs";
import { TaskBoard } from "@/components/task-board";
import { CreateTaskDialog, StuckDialog, TaskDetailDialog } from "@/components/task-dialogs";
import { Button } from "@/components/ui/button";
import { reelUrlFromShare } from "@/lib/reels";
import { AvatarBadge, GiftWell, IconWell, TagChip } from "@/components/mark";
import type { Task, TaskStatus } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";

type DialogState =
  | { kind: "none" }
  | { kind: "create-task" }
  | { kind: "detail"; taskId: string }
  | { kind: "stuck"; taskId: string }
  | { kind: "reward"; taskId: string }
  | { kind: "create-space" }
  | { kind: "join" };

function subscribeShare() {
  return () => undefined;
}

function currentShareText() {
  const params = new URLSearchParams(window.location.search);
  return [params.get("url"), params.get("text"), params.get("title")].filter(Boolean).join("\n");
}

export function OursyncApp() {
  const sharedText = useSyncExternalStore(subscribeShare, currentShareText, () => "");
  const sharedReel = reelUrlFromShare(sharedText) ?? "";
  return (
    <AppProvider>
      <Frame key={sharedReel || "home"} sharedReel={sharedReel} />
    </AppProvider>
  );
}

function Frame({ sharedReel }: { sharedReel: string }) {
  const { ready, needsAuth, bootError } = useApp();
  if (!ready) return <Splash label="正在鋪開今天的清單…" />;
  if (bootError) return <Splash label={bootError} />;
  if (needsAuth) return <AuthScreen />;
  return <Workspace sharedReel={sharedReel} />;
}

function Splash({ label }: { label: string }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo large />
        <p className="text-sm text-cocoa">{label}</p>
      </div>
    </main>
  );
}

function Workspace({ sharedReel }: { sharedReel: string }) {
  const { space, project, members, tasks, reels, myMembership, person, notify, updateTask, markReelConverted } = useApp();
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState<"board" | "reels">(sharedReel ? "reels" : "board");
  const [filter, setFilter] = useState<"all" | "mine" | "stuck">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [taskSeed, setTaskSeed] = useState<{
    reelId: string;
    title: string;
    link: string;
    description: string;
    image: string | null;
  } | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [spaceSettingsOpen, setSpaceSettingsOpen] = useState(false);
  const [burst, setBurst] = useState<string | null>(null);

  useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(null), 1100);
    return () => window.clearTimeout(timer);
  }, [burst]);

  async function changeStatus(task: Task, status: TaskStatus) {
    if (status === "stuck") {
      setDialog({ kind: "stuck", taskId: task.id });
      return;
    }
    if (status === task.status) return;
    try {
      await updateTask(task.id, { status });
      if (status === "completed") setDialog({ kind: "reward", taskId: task.id });
    } catch (error) {
      notify(errorMessage(error));
    }
  }

  async function copyCode() {
    if (!space) return;
    try {
      await navigator.clipboard.writeText(space.invite_code);
      notify("邀請碼已複製");
    } catch {
      notify("這次沒複製到，請手動選取邀請碼");
    }
  }

  const counts = {
    todo: tasks.filter((task) => task.status === "todo").length,
    progress: tasks.filter((task) => task.status === "in_progress").length,
    stuck: tasks.filter((task) => task.status === "stuck").length,
  };
  const names = members.map((member) => ({ id: member.user_id, ...person(member.user_id) }));
  const usedTags = [...new Set(tasks.flatMap((task) => task.tags))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const activeTag = tagFilter !== "all" && usedTags.includes(tagFilter) ? tagFilter : "all";
  const waiting = myMembership?.status === "pending";
  const canEditSpace = myMembership?.role === "owner" && myMembership.status === "approved";

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onCreateSpace={() => setDialog({ kind: "create-space" })}
        onJoinSpace={() => setDialog({ kind: "join" })}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto scroll-soft">
        <header className="sticky top-0 z-20 border-b border-white/60 bg-cream/80 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="flex items-start gap-3">
            <button
              type="button"
              className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-cocoa md:hidden"
              onClick={() => setNavOpen(true)}
              aria-label="打開空間選單"
            >
              <List className="h-4 w-4" weight="bold" />
            </button>
            {space && waiting ? (
              <div className="min-w-0 flex-1">
                <h2 className="flex min-w-0 items-center gap-2 text-2xl font-bold">
                  <IconWell value={space.emoji} size="sm" />
                  <span className="truncate">{space.name}</span>
                </h2>
                <p className="mt-1 text-sm text-cocoa">審核中，還沒有打開這份看板</p>
              </div>
            ) : space ? (
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="flex min-w-0 items-center gap-2 text-2xl font-bold">
                    <IconWell value={space.emoji} size="sm" />
                    <span className="truncate">{space.name}</span>
                  </h2>
                  {canEditSpace ? (
                    <button
                      type="button"
                      onClick={() => setSpaceSettingsOpen(true)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-cocoa shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                      aria-label="空間設定"
                    >
                      <Gear className="h-4 w-4" weight="bold" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void copyCode()}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-cocoa"
                  >
                    <Copy className="h-3 w-3" weight="bold" />
                    {space.invite_code}
                  </button>
                </div>
                {space.description ? <p className="mt-1 text-sm leading-6 text-cocoa">{space.description}</p> : null}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cocoa">
                  {names.length === 0
                    ? "還沒有其他成員"
                    : names.map((profile) => (
                        <span key={profile.id} className="inline-flex items-center gap-1.5">
                          <AvatarBadge name={profile.name} size="xs" />
                          {profile.name}
                        </span>
                      ))}
                </div>
                {project ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                    <IconWell value={project.icon_emoji} kind="project" size="xs" />
                    <span className="font-semibold">{project.name}</span>
                    {project.description ? <span className="text-cocoa"> · {project.description}</span> : null}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white px-3 py-1 text-cocoa">待辦 {counts.todo}</span>
                  <span className="rounded-full bg-leaf px-3 py-1 text-sage-deep">進行中 {counts.progress}</span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1",
                      counts.stuck > 0 ? "bg-stuck text-white" : "bg-white text-cocoa",
                    )}
                  >
                    卡住 {counts.stuck}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sage-deep">
                    <Broadcast className="h-3 w-3" weight="bold" />
                    即時同步
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <h2 className="text-2xl font-bold">先有一個共享空間</h2>
                <p className="mt-1 text-sm text-cocoa">建立屬於你們的清單，或用邀請碼走進去。</p>
              </div>
            )}
            {space && !waiting ? (
              <Button className="h-10 w-10 shrink-0 px-0 sm:w-auto sm:px-4" onClick={() => setDialog({ kind: "create-task" })}>
                <Plus className="h-5 w-5 shrink-0" weight="bold" />
                <span className="hidden sm:inline">新增任務</span>
              </Button>
            ) : null}
          </div>

          {space && !waiting ? (
            <div className="mt-4 space-y-3">
              <div className="flex w-fit rounded-full bg-white p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setView("board")}
                  className={cn("rounded-full px-4 py-1.5", view === "board" ? "bg-ink text-cream" : "text-cocoa")}
                >
                  看板
                </button>
                <button
                  type="button"
                  onClick={() => setView("reels")}
                  className={cn("rounded-full px-4 py-1.5", view === "reels" ? "bg-ink text-cream" : "text-cocoa")}
                >
                  <Lightbulb className="mr-1 inline h-3.5 w-3.5" weight="bold" />
                  靈感庫
                  {reels.some((reel) => !reel.converted_to_task_id) ? (
                    <span className="ml-1 text-xs">{reels.filter((reel) => !reel.converted_to_task_id).length}</span>
                  ) : null}
                </button>
              </div>
              {view === "board" ? (
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <label className="relative block min-w-0 lg:max-w-sm lg:flex-1">
                  <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" weight="bold" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜尋任務標題或標籤..."
                    aria-label="搜尋任務標題或標籤"
                    className="w-full rounded-full border border-white bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-mist focus:border-rose"
                  />
                </label>
                <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
                  <div className="flex rounded-full bg-white p-1 text-xs font-semibold">
                    {(
                      [
                        ["all", "全部"],
                        ["mine", "我的"],
                        ["stuck", "卡住了"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFilter(id)}
                        className={cn("rounded-full px-3 py-1", filter === id ? "bg-ink text-cream" : "text-cocoa")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex max-w-full flex-nowrap gap-1.5 overflow-x-auto scroll-soft pb-1 sm:flex-wrap sm:justify-end">
                    <button
                      type="button"
                      aria-pressed={activeTag === "all"}
                      onClick={() => setTagFilter("all")}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                        activeTag === "all" ? "bg-ink text-cream" : "bg-white text-cocoa",
                      )}
                    >
                      全部標籤
                    </button>
                    {usedTags.map((tag) => {
                      const selected = activeTag === tag;
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setTagFilter(tag)}
                          className={cn("shrink-0 rounded-full", selected && "ring-2 ring-ink/15")}
                        >
                          <TagChip tag={tag} className="text-xs font-semibold" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              ) : null}
            </div>
          ) : null}
        </header>

        <main className="px-4 py-4 sm:px-6">
          {space && waiting ? (
            <div className="mx-auto mt-16 max-w-md rounded-[32px] bg-white/80 p-8 text-center shadow-[0_24px_50px_-32px_rgba(80,48,36,0.7)]">
              <div className="flex justify-center">
                <IconWell value={space.emoji} size="lg" />
              </div>
              <h3 className="mt-4 text-xl font-bold">{space.name}</h3>
              <p className="mt-3 inline-flex rounded-full bg-[#e6dfd6] px-3 py-1 text-xs font-semibold text-cocoa">審核中</p>
              <p className="mt-4 text-sm leading-6 text-cocoa">
                邀請申請已送出，等待空間創作者審核中。通過之後，這份看板會自動打開。
              </p>
            </div>
          ) : space ? (
            view === "reels" ? (
              <ReelsLibrary
                initialUrl={sharedReel}
                onConvert={(reel) => {
                  setTaskSeed({
                    reelId: reel.id,
                    title: reel.title.trim() || "去這個地方 / 吃這個！",
                    link: reel.url,
                    description: reel.description.trim() || "從靈感庫排進來的 IG Reel。",
                    image: reel.thumbnail_url,
                  });
                  setDialog({ kind: "create-task" });
                }}
              />
            ) : (
              <TaskBoard
                filter={filter}
                tag={activeTag}
                query={query}
                onOpen={(taskId) => setDialog({ kind: "detail", taskId })}
                onStatus={(task, status) => void changeStatus(task, status)}
                onReward={(taskId) => setDialog({ kind: "reward", taskId })}
              />
            )
          ) : (
            <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white/75 p-6 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-pink-100 text-pink-500" aria-hidden>
                <Flower className="h-7 w-7" weight="bold" />
              </span>
              <h3 className="mt-3 text-xl font-bold">清單還在等你們</h3>
              <p className="mt-2 text-sm leading-6 text-cocoa">
                演唱會票、旅行預約、生活瑣事，放進同一個空間，卡住的時候也可以求救。
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button onClick={() => setDialog({ kind: "create-space" })}>建立空間</Button>
                <Button variant="soft" onClick={() => setDialog({ kind: "join" })}>
                  用邀請碼加入
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      <CreateSpaceDialog open={dialog.kind === "create-space"} onClose={() => setDialog({ kind: "none" })} />
      {space && spaceSettingsOpen ? (
        <SpaceSettingsDialog key={space.id} space={space} onClose={() => setSpaceSettingsOpen(false)} />
      ) : null}
      <JoinSpaceDialog open={dialog.kind === "join"} onClose={() => setDialog({ kind: "none" })} />
      <CreateTaskDialog
        key={`${taskSeed?.reelId ?? "new"}-${project?.id ?? "all"}`}
        open={dialog.kind === "create-task"}
        initial={
          taskSeed
            ? {
                title: taskSeed.title,
                link: taskSeed.link,
                description: taskSeed.description,
                image: taskSeed.image,
              }
            : undefined
        }
        onClose={() => {
          setDialog({ kind: "none" });
          setTaskSeed(null);
        }}
        onCreated={async (taskId) => {
          if (taskSeed) await markReelConverted(taskSeed.reelId, taskId);
        }}
      />
      {dialog.kind === "detail" ? (
        <TaskDetailDialog
          taskId={dialog.taskId}
          onClose={() => setDialog({ kind: "none" })}
          onCompleted={(taskId) => setDialog({ kind: "reward", taskId })}
        />
      ) : null}
      {dialog.kind === "stuck" ? (
        <StuckDialog taskId={dialog.taskId} onClose={() => setDialog({ kind: "none" })} />
      ) : null}
      {dialog.kind === "reward" ? (
        <RewardDialog
          taskId={dialog.taskId}
          onClose={() => setDialog({ kind: "none" })}
          onSent={setBurst}
        />
      ) : null}
      <Toast />
      {burst ? <GiftBurst giftId={burst} /> : null}
      </div>
  );
}

const CONFETTI = [
  { dx: "-72px", dy: "-86px", spin: "140deg", color: "#f3c1b8", delay: "0ms" },
  { dx: "64px", dy: "-78px", spin: "-120deg", color: "#c9d7c4", delay: "40ms" },
  { dx: "-96px", dy: "18px", spin: "80deg", color: "#e7d3a1", delay: "20ms" },
  { dx: "90px", dy: "24px", spin: "-90deg", color: "#e28b7a", delay: "70ms" },
  { dx: "-28px", dy: "-110px", spin: "200deg", color: "#f6d7c8", delay: "10ms" },
  { dx: "18px", dy: "96px", spin: "-160deg", color: "#d7c4e2", delay: "50ms" },
  { dx: "110px", dy: "-24px", spin: "40deg", color: "#f3e2a8", delay: "30ms" },
  { dx: "-120px", dy: "-28px", spin: "-40deg", color: "#f7efe6", delay: "60ms" },
];

function GiftBurst({ giftId }: { giftId: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center" aria-hidden>
      {CONFETTI.map((piece) => (
        <span
          key={`${piece.dx}-${piece.dy}`}
          className="gift-confetti-piece"
          style={
            {
              background: piece.color,
              animationDelay: piece.delay,
              "--dx": piece.dx,
              "--dy": piece.dy,
              "--spin": piece.spin,
            } as CSSProperties
          }
        />
      ))}
      <span className="gift-burst">
        <GiftWell id={giftId} size="lg" />
      </span>
    </div>
  );
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-cream shadow-lg">
      {toast}
    </div>
  );
}
