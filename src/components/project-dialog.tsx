"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { markKey, projectMarks, STICKER_WEIGHT } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, TextArea } from "@/components/ui/input";
import type { Project } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";

export function ProjectDialog({
  mode,
  onClose,
}: {
  mode: "create" | Project | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {mode ? <ProjectForm key={mode === "create" ? "create" : mode.id} mode={mode} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({ mode, onClose }: { mode: "create" | Project; onClose: () => void }) {
  const editing = mode === "create" ? null : mode;
  const { createProject, updateProject, deleteProject } = useApp();
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [emoji, setEmoji] = useState(editing ? markKey(editing.icon_emoji, "project") : "plane");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const input = { name, emoji, description };
      if (editing) await updateProject(editing.id, input);
      else await createProject(input);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!editing) return;
    setPending(true);
    setError(null);
    try {
      await deleteProject(editing.id);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  return (
    <>
      <DialogTitle className="pr-8 text-xl font-bold">{editing ? "編輯專案" : "新增專案"}</DialogTitle>
      <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">
        把同一趟旅行、一次派對或日常瑣事收成一個專案。空間裡的人都可以建立和調整。
      </DialogDescription>
      <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
        <Field label="專案名稱">
          <Input
            value={name}
            maxLength={40}
            placeholder="例如：2027 峇里島潛水之旅"
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field label="圖案">
          <div className="flex flex-wrap gap-2">
            {projectMarks().map((item) => {
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
                    "grid h-11 w-11 place-items-center rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
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
        </Field>
        <Field label="簡介" hint="選填">
          <TextArea
            value={description}
            maxLength={200}
            placeholder="這趟要一起完成的事"
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        {error ? <p className="text-sm text-stuck">{error}</p> : null}
        <div className="flex items-center justify-between gap-2">
          {editing ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={pending}>
                  再想想
                </Button>
                <Button type="button" variant="soft" onClick={() => void remove()} disabled={pending}>
                  確定收起
                </Button>
              </div>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} disabled={pending}>
                收起專案
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "儲存中…" : editing ? "儲存" : "建立專案"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
