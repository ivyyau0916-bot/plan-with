"use client";

import { ArrowSquareOut, ImageSquare, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { TagChip } from "@/components/mark";
import { MAX_TASK_IMAGES, TASK_TAG_PRESETS, linkHref } from "@/lib/task-extras";
import { cn } from "@/lib/utils";

export function TaskImage({
  src,
  alt,
  className,
  onError,
}: {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
}) {
  return (
    // User uploads and IG previews live on hosts that aren't known at build time.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={onError} />
  );
}

export function BookingLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-2xl bg-linen px-4 py-3 text-sm font-semibold text-ink transition hover:bg-blush"
    >
      開啟預訂連結
      <ArrowSquareOut className="h-4 w-4" weight="bold" />
    </a>
  );
}

export function ImageLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(src)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-ink/95 p-3 sm:p-4">
        <DialogTitle className="sr-only">任務圖片</DialogTitle>
        {src ? <TaskImage src={src} alt="任務圖片" className="max-h-[75vh] w-full rounded-2xl object-contain" /> : null}
      </DialogContent>
    </Dialog>
  );
}

export type PendingImage = { file: File; preview: string };

export function releasePreviews(images: PendingImage[]) {
  images.forEach((image) => URL.revokeObjectURL(image.preview));
}

export function TaskAttachmentFields({
  tags,
  onTags,
  link,
  onLink,
  savedImages,
  onSavedImages,
  files,
  onFiles,
  onPreview,
}: {
  tags: string[];
  onTags: (tags: string[]) => void;
  link: string;
  onLink: (link: string) => void;
  savedImages: string[];
  onSavedImages: (urls: string[]) => void;
  files: PendingImage[];
  onFiles: (files: PendingImage[]) => void;
  onPreview: (src: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const href = linkHref(link);
  const linkError = link.trim() && !href ? "這個連結好像不完整" : null;
  const total = savedImages.length + files.length;

  function toggleTag(tag: string) {
    onTags(tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag].slice(0, 8));
  }

  function addCustom() {
    const next = custom.trim();
    if (!next || tags.includes(next) || tags.length >= 8) return;
    onTags([...tags, next.slice(0, 24)]);
    setCustom("");
  }

  return (
    <>
      <div>
        <p className="mb-2 text-sm font-medium text-cocoa">標籤</p>
        <div className="flex flex-wrap gap-2">
          {TASK_TAG_PRESETS.map((tag) => {
            const selected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTag(tag)}
                className={cn("rounded-full", selected && "ring-2 ring-ink/15")}
              >
                <TagChip tag={tag} className="text-sm font-semibold" />
              </button>
            );
          })}
          {tags
            .filter((tag) => !TASK_TAG_PRESETS.includes(tag))
            .map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="rounded-full ring-2 ring-ink/15"
              >
                <TagChip tag={tag} className="text-sm font-semibold" />
              </button>
            ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={custom}
            maxLength={24}
            placeholder="自己的標籤，例如：旅行預訂"
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
            新增
          </button>
        </div>
      </div>

      <Field label="相關連結" hint={linkError ? undefined : "貼上 Klook、Trip.com 或門票網址"}>
        <Input
          value={link}
          inputMode="url"
          placeholder="https://"
          maxLength={500}
          onChange={(event) => onLink(event.target.value)}
        />
      </Field>
      {linkError ? <p className="-mt-2 text-sm text-stuck">{linkError}</p> : null}
      {href ? <BookingLink href={href} /> : null}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-cocoa">圖片</p>
          <p className="text-xs text-mist">
            {total}/{MAX_TASK_IMAGES}，單張 4MB 內
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {savedImages.map((url) => (
            <figure key={url} className="relative">
              <button type="button" onClick={() => onPreview(url)} className="block overflow-hidden rounded-2xl">
                <TaskImage src={url} alt="已上傳的圖片" className="h-20 w-20 object-cover" />
              </button>
              <button
                type="button"
                aria-label="移除圖片"
                onClick={() => onSavedImages(savedImages.filter((item) => item !== url))}
                className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-cream"
              >
                <X className="h-3 w-3" weight="bold" />
              </button>
            </figure>
          ))}
          {files.map((image, index) => (
            <figure key={image.preview} className="relative">
              <button
                type="button"
                onClick={() => onPreview(image.preview)}
                className="block overflow-hidden rounded-2xl"
              >
                <TaskImage src={image.preview} alt="準備上傳的圖片" className="h-20 w-20 object-cover" />
              </button>
              <button
                type="button"
                aria-label="移除圖片"
                onClick={() => {
                  URL.revokeObjectURL(image.preview);
                  onFiles(files.filter((_, item) => item !== index));
                }}
                className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-cream"
              >
                <X className="h-3 w-3" weight="bold" />
              </button>
            </figure>
          ))}
          {total < MAX_TASK_IMAGES ? (
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-2xl border border-dashed border-sand bg-linen/70 text-cocoa hover:bg-blush/50">
              <ImageSquare className="h-5 w-5" weight="bold" />
              <span className="sr-only">上傳圖片</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={(event) => {
                  const picked = Array.from(event.target.files ?? []);
                  const room = MAX_TASK_IMAGES - total;
                  const next = picked.slice(0, room).map((file) => ({
                    file,
                    preview: URL.createObjectURL(file),
                  }));
                  onFiles([...files, ...next]);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      </div>
    </>
  );
}
