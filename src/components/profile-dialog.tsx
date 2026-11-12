"use client";

import { Camera, Gear, Gift } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { GiftBoxDialog } from "@/components/gift-box-dialog";
import { AvatarBadge, isAvatarPhoto, markKey, spaceMarks, STICKER_WEIGHT } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { uploadAvatar } from "@/lib/avatar";
import { cn, errorMessage } from "@/lib/utils";

function useAvatarUpload(onUploaded?: (url: string) => void) {
  const { me, updateProfile } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !me) return;
    setPending(true);
    setError(null);
    try {
      const url = await uploadAvatar(file);
      await updateProfile(
        { name: me.display_name, avatar: markKey(me.avatar_emoji), avatarUrl: url },
        "頭像更新了",
      );
      onUploaded?.(url);
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setPending(false);
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg"
      className="sr-only"
      onChange={(event) => void onChange(event)}
    />
  );

  return { input, open: () => inputRef.current?.click(), pending, error };
}

export function ProfileSettingsDialog({ onClose }: { onClose: () => void }) {
  const { me, email, updateProfile } = useApp();
  const [name, setName] = useState(me?.display_name ?? "");
  const [avatar, setAvatar] = useState(markKey(me?.avatar_emoji));
  const [photo, setPhoto] = useState(isAvatarPhoto(me?.avatar_url) ? me?.avatar_url ?? null : null);
  const upload = useAvatarUpload(setPhoto);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setSaveError(null);
    try {
      await updateProfile({ name, avatar, avatarUrl: photo });
      onClose();
    } catch (error) {
      setSaveError(errorMessage(error));
      setPending(false);
    }
  }

  async function clearPhoto() {
    if (!me) return;
    setPending(true);
    setSaveError(null);
    try {
      setPhoto(null);
      await updateProfile(
        { name: me.display_name, avatar: markKey(me.avatar_emoji), avatarUrl: null },
        "已改回頭像圖標",
      );
    } catch (error) {
      setPhoto(isAvatarPhoto(me.avatar_url) ? me.avatar_url : null);
      setSaveError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="pr-8 text-xl font-bold">個人設定</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-cocoa">這個名稱會出現在空間成員、任務和禮物裡。</DialogDescription>
        <form className="mt-4 space-y-4" onSubmit={(event) => void save(event)}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="更換頭像"
              disabled={upload.pending || pending}
              onClick={upload.open}
              className="relative shrink-0"
            >
              <AvatarBadge name={name || "你"} mark={photo || avatar} size="lg" className="rounded-full" />
              <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-white text-cocoa shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <Camera className="h-3.5 w-3.5" weight="bold" />
              </span>
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold">更換頭像</p>
              <p className="text-xs leading-5 text-cocoa">JPG 或 PNG，2MB 以內。沒有照片時顯示圖標。</p>
            </div>
          </div>
          {upload.input}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="soft" size="sm" onClick={upload.open} disabled={upload.pending || pending}>
              <Camera className="h-3.5 w-3.5" weight="bold" />
              {upload.pending ? "上傳中…" : "更換頭像"}
            </Button>
            {photo ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => void clearPhoto()} disabled={pending}>
                改回圖標
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {spaceMarks().map((item) => {
              const Icon = item.icon;
              const selected = avatar === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={selected}
                  onClick={() => setAvatar(item.key)}
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-2xl",
                    item.well,
                    item.ink,
                    selected ? "ring-2 ring-ink" : "ring-1 ring-transparent",
                  )}
                >
                  <Icon className="h-5 w-5" weight={STICKER_WEIGHT} />
                </button>
              );
            })}
          </div>
          <Field label="顯示名稱" hint="最多 24 個字">
            <Input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} autoComplete="nickname" />
          </Field>
          <Field label="帳號信箱">
            <Input value={email ?? "這是暱稱登入，沒有信箱"} readOnly className="bg-linen text-cocoa" />
          </Field>
          {upload.error ? <p className="text-sm text-stuck">{upload.error}</p> : null}
          {saveError ? <p className="text-sm text-stuck">{saveError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending || upload.pending}>
              關閉
            </Button>
            <Button type="submit" disabled={pending || upload.pending}>
              {pending ? "儲存中…" : "儲存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileButton({
  name,
  mark,
  size = "sm",
  className,
  showName = false,
}: {
  name: string;
  mark?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showName?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-w-0 items-center gap-2 rounded-full text-left"
        aria-label="個人設定"
      >
        <AvatarBadge name={name} mark={mark} size={size} className={cn("rounded-full", className)} />
        {showName ? <span className="truncate text-sm font-semibold">{name || "登入中"}</span> : null}
      </button>
      {open ? <ProfileSettingsDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function ProfileCard() {
  const { me, giftCounts, signOut } = useApp();
  const [open, setOpen] = useState(false);
  const upload = useAvatarUpload();
  const received = giftCounts
    .filter((row) => row.receiver_id === me?.id)
    .reduce((sum, row) => sum + row.item_count, 0);
  const name = me?.display_name ?? "";
  const mark = (isAvatarPhoto(me?.avatar_url) ? me?.avatar_url : null) || me?.avatar_emoji;

  return (
    <div className="mt-4 rounded-3xl bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="上傳頭像"
          disabled={upload.pending}
          onClick={upload.open}
          className="relative shrink-0"
        >
          <AvatarBadge name={name || "你"} mark={mark} size="lg" className="h-14 w-14 rounded-full" />
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-cocoa shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <Camera className="h-3.5 w-3.5" weight="bold" />
          </span>
        </button>
        {upload.input}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name || "登入中"}</p>
          <GiftBadge received={received} />
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button type="button" variant="soft" size="sm" className="px-2.5" onClick={() => setOpen(true)}>
            <Gear className="h-3.5 w-3.5" weight="bold" />
            個人設定
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
            登出
          </Button>
        </div>
      </div>
      {upload.pending ? <p className="mt-2 text-xs text-cocoa">頭像上傳中…</p> : null}
      {upload.error ? <p className="mt-2 text-xs text-stuck">{upload.error}</p> : null}
      {open ? <ProfileSettingsDialog onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function GiftBadge({ received }: { received: number }) {
  const [giftBoxOpen, setGiftBoxOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setGiftBoxOpen(true)}
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-blush px-2 py-0.5 text-xs font-bold text-ink"
        aria-label={`禮物箱，累計 ${received} 份`}
      >
        <Gift className="h-3.5 w-3.5" weight="bold" aria-hidden />
        <span>{received}</span>
      </button>
      <GiftBoxDialog open={giftBoxOpen} onClose={() => setGiftBoxOpen(false)} />
    </>
  );
}
