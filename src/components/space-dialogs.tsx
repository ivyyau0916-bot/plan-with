"use client";

import { Check, Copy, Gear, Trash, UserMinus, Users, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, TextArea } from "@/components/ui/input";
import { useApp } from "@/components/app-provider";
import { AvatarBadge, IconWell, RoleBadge, spaceMarks, STICKER_WEIGHT } from "@/components/mark";
import type { Space } from "@/lib/types";
import { cn, errorMessage, formatWhen, SPACE_ACCENTS } from "@/lib/utils";

export function CreateSpaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createSpace, notify } = useApp();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("heart");
  const [accent, setAccent] = useState("blush");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function close() {
    setName("");
    setEmoji("heart");
    setAccent("blush");
    setInviteCode(null);
    setCopied(false);
    setError(null);
    onClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const code = await createSpace(name, emoji, accent);
      setInviteCode(code || null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function copyCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      notify("邀請碼已複製");
    } catch {
      notify("這次沒複製到，請手動選取邀請碼");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogTitle className="pr-8 text-xl font-bold">建立共享空間</DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">
          情侶、朋友或一趟旅行都可以各開一組。建立後會得到一組 6 位數邀請碼，你自己會先加入。
        </DialogDescription>
        {inviteCode ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-6 text-cocoa">把這組邀請碼傳給對方，對方加入後就能一起看這份清單。</p>
            <p className="rounded-2xl bg-linen px-4 py-3 text-center font-display text-2xl font-extrabold tracking-[0.18em]">
              {inviteCode}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="soft" onClick={() => void copyCode()}>
                {copied ? <Check className="h-4 w-4" weight="bold" /> : <Copy className="h-4 w-4" weight="bold" />}
                {copied ? "已複製" : "複製邀請碼"}
              </Button>
              <Button type="button" onClick={close}>
                打開看板
              </Button>
            </div>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
            <Field label="空間名稱">
              <Input
                value={name}
                maxLength={24}
                placeholder="例如：二人世界、閨蜜大阪之旅"
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-cocoa">圖示</p>
              <div className="flex flex-wrap gap-2">
                {spaceMarks().map((item) => {
                  const Icon = item.icon;
                  const selected = emoji === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-label={item.label}
                      aria-pressed={selected}
                      onClick={() => setEmoji(item.key)}
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
                        item.well,
                        item.ink,
                        selected && "ring-2 ring-ink/20",
                      )}
                    >
                      <Icon className="h-4 w-4" weight={STICKER_WEIGHT} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-cocoa">顏色</p>
              <div className="flex flex-wrap gap-2">
                {SPACE_ACCENTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={accent === item.id}
                    onClick={() => setAccent(item.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold",
                      item.className,
                      accent === item.id ? "ring-2 ring-ink ring-offset-2 ring-offset-foam" : "",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {error ? <p className="text-sm text-stuck">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                取消
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "建立中…" : "建立空間"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function JoinSpaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { joinSpace } = useApp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await joinSpace(code);
      setCode("");
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogTitle className="pr-8 text-xl font-bold">用邀請碼加入</DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">
          輸入對方給你的邀請碼，例如 HUG-888。對上之後會先送給空間建立者審核，通過才能看到任務。
        </DialogDescription>
        <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
          <Field label="邀請碼">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="HUG-888"
              autoCapitalize="characters"
              required
            />
          </Field>
          {error ? <p className="text-sm text-stuck">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={pending || code.trim().length < 4}>
              {pending ? "送出中…" : "送出申請"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MemberManageDialog({ spaceId, onClose }: { spaceId: string | null; onClose: () => void }) {
  const { spaces, spaceMembers, membershipOf, me, person, reviewMembership, removeMember, leaveSpace } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; kind: "remove" | "leave"; name: string } | null>(null);
  const space = spaces.find((item) => item.id === spaceId) ?? null;
  const mine = spaceId ? membershipOf(spaceId) : null;
  const isOwner = mine?.role === "owner" && mine.status === "approved";
  const rows = spaceId ? spaceMembers(spaceId) : [];
  const approved = rows
    .filter((member) => member.status === "approved")
    .sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner") || a.joined_at.localeCompare(b.joined_at));
  const pending = isOwner ? rows.filter((member) => member.status === "pending") : [];

  async function decide(memberId: string, decision: "approved" | "rejected") {
    setBusyId(memberId);
    setError(null);
    try {
      await reviewMembership(memberId, decision);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmAction() {
    if (!confirm || !spaceId) return;
    setBusyId(confirm.id);
    setError(null);
    try {
      if (confirm.kind === "remove") {
        await removeMember(confirm.id);
        setConfirm(null);
      } else {
        await leaveSpace(spaceId);
        setConfirm(null);
        onClose();
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog
      open={spaceId !== null}
      onOpenChange={(next) => {
        if (!next) {
          setConfirm(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogTitle className="flex items-center gap-2 pr-8 text-xl font-bold">
          <Users className="h-5 w-5 shrink-0 text-cocoa" weight="bold" />
          成員管理
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">
          {space ? (
            <span className="inline-flex items-center gap-1.5">
              <IconWell value={space.emoji} size="xs" />
              {space.name} 裡的人
            </span>
          ) : (
            "看看這個空間裡有誰"
          )}
        </DialogDescription>
        <ul className="mt-5 space-y-2">
          {approved.map((member) => {
            const profile = person(member.user_id);
            const ownerRow = member.role === "owner";
            return (
              <li key={member.id} className="flex items-center gap-3 rounded-3xl bg-white/80 px-3 py-3">
                <AvatarBadge name={profile.name} mark={profile.emoji} size="md" className="h-11 w-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {profile.name}
                    {member.user_id === me?.id ? "（我）" : ""}
                  </span>
                  <span className="mt-1 inline-flex">
                    <RoleBadge owner={ownerRow} />
                  </span>
                </span>
                {isOwner && !ownerRow ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={busyId === member.id}
                    onClick={() => setConfirm({ id: member.id, kind: "remove", name: profile.name })}
                  >
                    <UserMinus className="h-4 w-4" weight="bold" />
                    移出空間
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>

        {pending.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm font-semibold">審核中</p>
            <ul className="mt-2 space-y-2">
              {pending.map((member) => {
                const profile = person(member.user_id);
                const busy = busyId === member.id;
                return (
                  <li key={member.id} className="rounded-3xl bg-white/80 p-3">
                    <div className="flex items-center gap-3">
                      <AvatarBadge name={profile.name} mark={profile.emoji} size="md" className="h-11 w-11" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{profile.name}</p>
                        <p className="text-xs text-mist">申請於 {formatWhen(member.joined_at)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button type="button" variant="ghost" disabled={busy} onClick={() => void decide(member.id, "rejected")}>
                        <X className="h-4 w-4" weight="bold" />
                        拒絕
                      </Button>
                      <Button type="button" disabled={busy} onClick={() => void decide(member.id, "approved")}>
                        <Check className="h-4 w-4" weight="bold" />
                        同意加入
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {confirm ? (
          <div className="mt-4 rounded-2xl bg-linen px-4 py-3">
            <p className="text-sm leading-6 text-ink">
              {confirm.kind === "remove" ? `確定要將 ${confirm.name} 移出這個空間嗎？` : "確定要退出這個空間嗎？"}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={Boolean(busyId)} onClick={() => setConfirm(null)}>
                再想想
              </Button>
              <Button type="button" variant="danger" disabled={Boolean(busyId)} onClick={() => void confirmAction()}>
                {confirm.kind === "remove" ? "確定移出" : "退出空間"}
              </Button>
            </div>
          </div>
        ) : null}

        {mine?.role === "member" && mine.status === "approved" ? (
          <div className="mt-5 flex justify-end">
            <Button type="button" variant="danger" onClick={() => setConfirm({ id: mine.id, kind: "leave", name: me?.display_name ?? "我" })}>
              退出空間
            </Button>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-stuck">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}

export function SpaceSettingsDialog({ space, onClose }: { space: Space; onClose: () => void }) {
  const { updateSpace, deleteSpace } = useApp();
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateSpace(space.id, { name, description });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open && !confirming) onClose(); }}>
        <DialogContent>
          <DialogTitle className="flex items-center gap-2 pr-8 text-xl font-bold">
            <Gear className="h-5 w-5 text-cocoa" weight="bold" />
            空間設定
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">
            改名稱和簡介。邀請碼維持不變。
          </DialogDescription>
          <form className="mt-5 space-y-4" onSubmit={(event) => void save(event)}>
            <Field label="空間名稱">
              <Input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} required />
            </Field>
            <Field label="空間簡介" hint="選填">
              <TextArea
                value={description}
                maxLength={200}
                placeholder="例如：兩個人的大阪清單"
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            {error ? <p className="text-sm text-stuck">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
                關閉
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "儲存中…" : "儲存"}
              </Button>
            </div>
          </form>
          <div className="mt-6 rounded-3xl border border-dashed border-rose/50 bg-stuck-bg/40 px-4 py-4">
            <p className="text-sm font-semibold text-stuck">危險區域</p>
            <p className="mt-1 text-sm leading-6 text-cocoa">刪除後，這個空間裡的專案、任務和禮物都會一起消失。</p>
            <Button type="button" variant="danger" className="mt-3" onClick={() => setConfirming(true)}>
              <Trash className="h-4 w-4" weight="bold" />
              刪除此空間
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {confirming ? (
        <DeleteSpaceDialog
          spaceName={space.name}
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            await deleteSpace(space.id);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}

function DeleteSpaceDialog({
  spaceName,
  onCancel,
  onConfirm,
}: {
  spaceName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const matched = typed.trim() === spaceName;

  async function confirm() {
    if (!matched) return;
    setPending(true);
    setDeleteError(null);
    try {
      await onConfirm();
    } catch (caught) {
      setDeleteError(errorMessage(caught));
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        <DialogTitle className="pr-8 text-xl font-bold text-stuck">刪除此空間</DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">
          警告：刪除空間將會永久移除所有專案、任務與禮物記錄，無法復原。請輸入空間名稱以確認刪除。
        </DialogDescription>
        <div className="mt-4">
          <Field label={`輸入「${spaceName}」`}>
            <Input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
          </Field>
        </div>
        {deleteError ? <p className="mt-3 text-sm text-stuck">{deleteError}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            再想想
          </Button>
          <Button type="button" variant="danger" disabled={!matched || pending} onClick={() => void confirm()}>
            {pending ? "刪除中…" : "永久刪除"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
