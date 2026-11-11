"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { AvatarBadge, markKey, spaceMarks, STICKER_WEIGHT } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { cn, errorMessage } from "@/lib/utils";

export function ProfileSettingsDialog({ onClose }: { onClose: () => void }) {
  const { me, email, updateProfile } = useApp();
  const [name, setName] = useState(me?.display_name ?? "");
  const [avatar, setAvatar] = useState(markKey(me?.avatar_url || me?.avatar_emoji));
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setSaveError(null);
    try {
      await updateProfile({ name, avatar });
      onClose();
    } catch (error) {
      setSaveError(errorMessage(error));
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
            <AvatarBadge name={name || "你"} mark={avatar} size="lg" />
            <p className="text-sm text-cocoa">選擇一個頭像風格</p>
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
          {saveError ? <p className="text-sm text-stuck">{saveError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              關閉
            </Button>
            <Button type="submit" disabled={pending}>
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
        <AvatarBadge name={name} mark={mark} size={size} className={className} />
        {showName ? <span className="truncate text-sm font-semibold">{name || "登入中"}</span> : null}
      </button>
      {open ? <ProfileSettingsDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
