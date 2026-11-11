"use client";

import { ArrowSquareOut, Lightbulb, Play, Sparkle, Tag, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { AvatarBadge, TagChip } from "@/components/mark";
import { TaskImage } from "@/components/task-extras";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ReelIdea } from "@/lib/types";
import { normalizeTags } from "@/lib/task-extras";
import { cn, errorMessage } from "@/lib/utils";

const REEL_TAG_PRESETS = ["美食探店", "景點打卡", "購物", "展覽活動"];

export function ReelsLibrary({
  initialUrl,
  onConvert,
}: {
  initialUrl: string;
  onConvert: (reel: ReelIdea) => void;
}) {
  const { reels, person, createReel, deleteReel } = useApp();
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReelIdea | null>(null);
  const usedTags = [...new Set(reels.flatMap((reel) => reel.tags ?? []))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const activeTag = tagFilter !== "all" && usedTags.includes(tagFilter) ? tagFilter : "all";
  const visible = activeTag === "all" ? reels : reels.filter((reel) => (reel.tags ?? []).includes(activeTag));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createReel(url, title, tags);
      setUrl("");
      setTitle("");
      setTags([]);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="pb-10">
      <div className="rounded-3xl bg-white/80 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-50 text-amber-700">
            <Lightbulb className="h-4 w-4" weight="bold" />
          </span>
          靈感庫
        </h2>
        <p className="mt-1 text-sm leading-6 text-cocoa">把 IG 上想一起去、一起吃的 Reels 先放這裡，之後再排進任務。</p>
        <form className="mt-4 space-y-3" onSubmit={(event) => void submit(event)}>
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="貼上 IG Reels 網址 (https://www.instagram.com/reel/...)"
            inputMode="url"
            required
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="備註，例如：這家拉麵"
            />
            <Button type="submit" className="shrink-0" disabled={pending || !url.trim()}>
              {pending ? "讀取封面…" : "新增"}
            </Button>
          </div>
          <ReelTagPicker tags={tags} onTags={setTags} />
          {error ? <p className="text-sm text-stuck">{error}</p> : null}
        </form>
        {reels.length > 0 ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              aria-pressed={activeTag === "all"}
              onClick={() => setTagFilter("all")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                activeTag === "all" ? "bg-ink text-cream" : "bg-linen text-cocoa",
              )}
            >
              全部靈感
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
        ) : null}
      </div>

      {reels.length === 0 ? (
        <p className="mt-4 rounded-3xl border border-dashed border-sand px-4 py-10 text-center text-sm text-cocoa">
          還沒有收藏。在 IG 複製 Reels 連結，貼到上面即可。
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-4 rounded-3xl border border-dashed border-sand px-4 py-10 text-center text-sm text-cocoa">
          這個標籤還沒有靈感。
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((reel) => (
            <ReelCard
              key={reel.id}
              reel={reel}
              author={person(reel.created_by)}
              confirming={confirmId === reel.id}
              onEdit={() => setEditing(reel)}
              onConvert={() => onConvert(reel)}
              onDelete={() => {
                if (confirmId !== reel.id) {
                  setConfirmId(reel.id);
                  return;
                }
                setConfirmId(null);
                void deleteReel(reel.id).catch((caught: unknown) => setError(errorMessage(caught)));
              }}
            />
          ))}
        </div>
      )}
      {editing ? <ReelTagsDialog key={editing.id} reel={editing} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}

function ReelTagPicker({ tags, onTags }: { tags: string[]; onTags: (tags: string[]) => void }) {
  const [custom, setCustom] = useState("");

  function toggle(tag: string) {
    onTags(tags.includes(tag) ? tags.filter((item) => item !== tag) : normalizeTags([...tags, tag]));
  }

  function addCustom() {
    const next = custom.trim();
    if (!next) return;
    onTags(normalizeTags([...tags, next]));
    setCustom("");
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-cocoa">標籤</p>
      <div className="flex flex-wrap gap-2">
        {REEL_TAG_PRESETS.map((tag) => {
          const selected = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(tag)}
              className={cn("rounded-full", selected && "ring-2 ring-ink/15")}
            >
              <TagChip tag={tag} className="text-sm font-semibold" />
            </button>
          );
        })}
        {tags
          .filter((tag) => !REEL_TAG_PRESETS.includes(tag))
          .map((tag) => (
            <button key={tag} type="button" onClick={() => toggle(tag)} className="rounded-full ring-2 ring-ink/15">
              <TagChip tag={tag} className="text-sm font-semibold" />
            </button>
          ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={custom}
          maxLength={24}
          placeholder="自己的標籤，例如：私房景點"
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addCustom();
          }}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim() || tags.length >= 8}
          className="shrink-0 rounded-2xl bg-linen px-3 text-sm font-semibold text-cocoa disabled:opacity-40"
        >
          加上
        </button>
      </div>
    </div>
  );
}

function ReelTagsDialog({ reel, onClose }: { reel: ReelIdea; onClose: () => void }) {
  const { updateReel } = useApp();
  const [tags, setTags] = useState(reel.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await updateReel(reel.id, tags);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogTitle className="pr-8 text-xl font-bold">編輯標籤</DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">
          {reel.title || "去這個地方 / 吃這個！"}
        </DialogDescription>
        <div className="mt-4">
          <ReelTagPicker tags={tags} onTags={setTags} />
        </div>
        {error ? <p className="mt-3 text-sm text-stuck">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            取消
          </Button>
          <Button type="button" onClick={() => void save()} disabled={pending}>
            {pending ? "儲存中…" : "儲存標籤"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReelCard({
  reel,
  author,
  confirming,
  onEdit,
  onConvert,
  onDelete,
}: {
  reel: ReelIdea;
  author: { name: string; emoji: string };
  confirming: boolean;
  onEdit: () => void;
  onConvert: () => void;
  onDelete: () => void;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = Boolean(reel.thumbnail_url) && !thumbFailed;

  return (
    <article className="overflow-hidden rounded-3xl border border-white bg-foam shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <a href={reel.url} target="_blank" rel="noreferrer" className="block">
        {showThumb && reel.thumbnail_url ? (
          <TaskImage
            src={reel.thumbnail_url}
            alt={reel.title || "IG Reel 縮圖"}
            className="aspect-[9/16] w-full object-cover"
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <div className="flex aspect-[9/16] flex-col items-center justify-center bg-gradient-to-br from-blush via-foam to-[#f3e4f6] px-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/80 text-coral shadow-sm" aria-hidden>
              <Play className="h-6 w-6" weight="bold" />
            </span>
            <p className="mt-3 font-display text-xs font-extrabold tracking-[0.16em] text-coral">INSTAGRAM</p>
            <p className="mt-2 text-sm leading-6 text-cocoa">instagram.com</p>
          </div>
        )}
      </a>
      <div className="space-y-3 p-3">
        <div>
          <p className="font-semibold leading-6">{reel.title || "去這個地方 / 吃這個！"}</p>
          {(reel.tags ?? []).length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {(reel.tags ?? []).map((tag) => (
                <TagChip key={tag} tag={tag} className="text-[11px] font-semibold" />
              ))}
            </div>
          ) : null}
          {reel.description ? (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-cocoa">{reel.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-mist">
            <span className="inline-flex items-center gap-1">
              <AvatarBadge name={author.name} size="xs" />
              {author.name} 收藏
            </span>
          </p>
        </div>
        {reel.converted_to_task_id ? (
          <p className="w-fit rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-sage-deep">已排入任務</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <a
            href={reel.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-linen px-3 py-1.5 text-xs font-semibold text-cocoa"
          >
            <ArrowSquareOut className="h-3.5 w-3.5" weight="bold" />
            在 IG 中開啟
          </a>
          <button
            type="button"
            onClick={onConvert}
            disabled={Boolean(reel.converted_to_task_id)}
            className="inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
          >
            <Sparkle className="h-3.5 w-3.5" weight="bold" />
            轉為任務
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-cocoa shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
          >
            <Tag className="h-3.5 w-3.5" weight="bold" />
            編輯標籤
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-stuck"
          >
            <Trash className="h-3.5 w-3.5" weight="bold" />
            {confirming ? "確定刪除？" : "刪除"}
          </button>
        </div>
      </div>
    </article>
  );
}
