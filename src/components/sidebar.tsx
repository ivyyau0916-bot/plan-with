"use client";

import { useState } from "react";
import { Gift, Plus, PushPin, Ticket, Users, X } from "@phosphor-icons/react";
import { GiftBoxDialog } from "@/components/gift-box-dialog";
import { AvatarBadge, IconWell } from "@/components/mark";
import { Logo } from "@/components/logo";
import { ProjectDialog } from "@/components/project-dialog";
import { MemberManageDialog } from "@/components/space-dialogs";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app-provider";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Sidebar({
  open,
  onClose,
  onCreateSpace,
  onJoinSpace,
}: {
  open: boolean;
  onClose: () => void;
  onCreateSpace: () => void;
  onJoinSpace: () => void;
}) {
  const { me, spaces, space, projects, project, giftCounts, reviewQueue, membershipOf, setActiveSpace, setActiveProject, signOut } =
    useApp();
  const [manageSpaceId, setManageSpaceId] = useState<string | null>(null);
  const [giftBoxOpen, setGiftBoxOpen] = useState(false);
  const [projectMode, setProjectMode] = useState<"create" | Project | null>(null);
  const received = giftCounts
    .filter((row) => row.receiver_id === me?.id)
    .reduce((sum, row) => sum + row.item_count, 0);

  return (
    <>
      {open ? (
        <button className="fixed inset-0 z-30 bg-[#3d322c]/30 md:hidden" aria-label="關閉選單" onClick={onClose} />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-dvh w-[292px] min-h-0 shrink-0 flex-col overflow-hidden border-r border-sand/80 bg-[#f8efe6]/95 px-4 py-5 backdrop-blur-md transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between">
          <Logo />
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cocoa hover:bg-white md:hidden"
            onClick={onClose}
            aria-label="關閉"
          >
            <X className="h-4 w-4" weight="bold" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-[1.4fr_1fr] gap-2">
          <Button onClick={onCreateSpace}>
            <Plus className="h-4 w-4" weight="bold" />
            建立
          </Button>
          <Button variant="soft" onClick={onJoinSpace}>
            <Ticket className="h-4 w-4" weight="bold" />
            加入
          </Button>
        </div>

        <p className="mt-5 px-1 text-xs font-medium tracking-wide text-mist">共享空間</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto scroll-soft">
          {spaces.length === 0 ? (
            <p className="rounded-3xl bg-white/60 px-3 py-4 text-sm leading-6 text-cocoa shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
              還沒有空間。建立一個，或用邀請碼走進對方的清單。
            </p>
          ) : (
            spaces.map((item) => {
              const active = item.id === space?.id;
              const mine = membershipOf(item.id);
              const pending = mine?.status === "pending";
              const requests = reviewQueue.filter((member) => member.space_id === item.id).length;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-3xl transition",
                    pending ? "bg-[#e6dfd6]" : active ? "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]" : "hover:bg-white/70",
                    active && pending && "ring-2 ring-sand",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSpace(item.id);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span className="relative">
                      <IconWell
                        value={item.emoji}
                        className={pending ? "bg-white/70 text-cocoa grayscale" : undefined}
                      />
                      {requests > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-[#f8efe6]" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-semibold", pending && "text-cocoa")}>{item.name}</span>
                      <span className="block text-xs text-mist">{pending ? "審核中" : item.invite_code}</span>
                    </span>
                  </button>
                  {mine?.status === "approved" && active ? (
                    <button
                      type="button"
                      className="px-3 pb-2.5 text-left text-xs font-semibold text-cocoa"
                      onClick={() => setManageSpaceId(item.id)}
                    >
                      <Users className="mr-1 inline h-3.5 w-3.5" weight="bold" />
                      成員管理
                    </button>
                  ) : null}
                  {requests > 0 ? (
                    <button
                      type="button"
                      className="px-3 pb-2.5 text-left text-xs font-semibold text-coral"
                      onClick={() => setManageSpaceId(item.id)}
                    >
                      成員審核申請 ({requests})
                    </button>
                  ) : null}
                  {mine?.status === "approved" && active ? (
                    <div className="space-y-1 px-2 pb-2">
                      <p className="px-1 text-[11px] font-medium text-mist">專案</p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProject(null);
                          onClose();
                        }}
                        className={cn(
                          "flex w-full items-center rounded-xl px-2 py-1.5 text-left text-sm",
                          project ? "text-cocoa hover:bg-linen" : "bg-linen font-semibold text-ink",
                        )}
                      >
                        <PushPin className="mr-1.5 inline h-3.5 w-3.5" weight="bold" />
                        所有任務
                      </button>
                      {projects.map((item) => {
                        const selected = project?.id === item.id;
                        return (
                          <div key={item.id} className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveProject(item.id);
                                onClose();
                              }}
                              className={cn(
                                "min-w-0 flex-1 truncate rounded-xl px-2 py-1.5 text-left text-sm",
                                selected ? "bg-linen font-semibold text-ink" : "text-cocoa hover:bg-linen",
                              )}
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                <IconWell value={item.icon_emoji} kind="project" size="xs" />
                                <span className="truncate">{item.name}</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={`編輯${item.name}`}
                              className="shrink-0 rounded-lg px-1.5 py-1 text-[11px] text-mist hover:bg-linen hover:text-ink"
                              onClick={() => setProjectMode(item)}
                            >
                              編輯
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        className="w-full rounded-xl px-2 py-1.5 text-left text-sm font-semibold text-coral hover:bg-linen"
                        onClick={() => setProjectMode("create")}
                      >
                        <Plus className="mr-1 inline h-3.5 w-3.5" weight="bold" />
                        新增專案
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-white/75 p-3">
          <AvatarBadge name={me?.display_name ?? ""} size="md" className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{me?.display_name ?? "登入中"}</p>
            <button
              type="button"
              onClick={() => setGiftBoxOpen(true)}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-blush px-2 py-0.5 text-xs font-bold text-ink"
              aria-label={`禮物箱，累計 ${received} 份`}
            >
              <Gift className="h-3.5 w-3.5" weight="bold" aria-hidden />
              <span>x {received}</span>
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            登出
          </Button>
        </div>
      </aside>
      <MemberManageDialog spaceId={manageSpaceId} onClose={() => setManageSpaceId(null)} />
      <GiftBoxDialog open={giftBoxOpen} onClose={() => setGiftBoxOpen(false)} />
      <ProjectDialog mode={projectMode} onClose={() => setProjectMode(null)} />
    </>
  );
}
