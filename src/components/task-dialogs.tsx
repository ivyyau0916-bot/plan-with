"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { AvatarBadge, IconWell } from "@/components/mark";
import {
  ImageLightbox,
  releasePreviews,
  TaskAttachmentFields,
  type PendingImage,
} from "@/components/task-extras";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { controlClass, Field, Input, TextArea } from "@/components/ui/input";
import { deleteTaskImages, linkHref, uploadTaskImages } from "@/lib/task-extras";
import type { Priority, Task, TaskStatus } from "@/lib/types";
import { cn, errorMessage, formatWhen, PRIORITY_META, STATUS_META } from "@/lib/utils";

const PRIORITIES: Priority[] = ["low", "medium", "high"];
const STATUSES: TaskStatus[] = ["todo", "in_progress", "stuck", "completed"];

function PriorityPicker({ value, onChange }: { value: Priority; onChange: (value: Priority) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRIORITIES.map((priority) => (
        <button
          key={priority}
          type="button"
          aria-pressed={value === priority}
          onClick={() => onChange(priority)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-semibold",
            value === priority ? "bg-ink text-cream" : "bg-linen text-cocoa",
          )}
        >
          <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", PRIORITY_META[priority].dot)} />
          {PRIORITY_META[priority].label}
        </button>
      ))}
    </div>
  );
}

function ProjectField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { projects } = useApp();
  return (
    <Field label="所屬專案">
      <div className="flex items-center gap-2">
        {value ? <IconWell value={projects.find((item) => item.id === value)?.icon_emoji} kind="project" size="sm" /> : null}
        <select className={cn(controlClass, "min-w-0 flex-1")} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">不放進特定專案</option>
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </Field>
  );
}

function AssigneeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { members, person } = useApp();
  return (
    <div className="flex items-center gap-2">
      <AvatarBadge name={value ? person(value).name : "未指派"} mark={value ? person(value).emoji : null} size="sm" />
      <select className={cn(controlClass, "min-w-0 flex-1")} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">未指派</option>
        {members.map((member) => {
          const profile = person(member.user_id);
          return (
            <option key={member.user_id} value={member.user_id}>
              {profile.name}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export function CreateTaskDialog({
  open,
  onClose,
  initial,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  initial?: { title: string; link: string; description?: string; image?: string | null };
  onCreated?: (taskId: string) => Promise<void> | void;
}) {
  const { me, space, project, createTask } = useApp();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [assignee, setAssignee] = useState(me?.id ?? "");
  const [projectId, setProjectId] = useState(project?.id ?? "");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [link, setLink] = useState(initial?.link ?? "");
  const [savedImages, setSavedImages] = useState<string[]>(
    initial?.image && initial.image.startsWith("https://") ? [initial.image] : [],
  );
  const [files, setFiles] = useState<PendingImage[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function clearDraft() {
    releasePreviews(files);
    setTitle("");
    setDescription("");
    setDue("");
    setPriority("medium");
    setTags([]);
    setLink("");
    setFiles([]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (link.trim() && !linkHref(link)) {
      setError("這個連結好像不完整");
      return;
    }
    if (!space) {
      setError("先選一個空間");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const uploaded = await uploadTaskImages(
        space.id,
        files.map((image) => image.file),
      );
      const image_urls = [...savedImages, ...uploaded].slice(0, 4);
      const taskId = await createTask({
        title,
        description,
        assignee_id: assignee || null,
        due_date: due || null,
        priority,
        status: "todo",
        stuck_note: null,
        tags,
        link_url: link,
        image_urls,
        project_id: projectId || null,
      });
      if (onCreated) await onCreated(taskId);
      clearDraft();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogTitle className="pr-8 text-xl font-bold">
          {initial ? "把這則靈感排進任務" : "記下一件一起做的事"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-cocoa">
          {initial
            ? "連結已經帶上了。選好誰負責、什麼時候去，就會出現在看板上。"
            : "寫清楚要做什麼、誰負責，就不容易在對話裡消失。"}
        </DialogDescription>
        <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
          <Field label="標題">
            <Input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} required />
          </Field>
          <Field label="說明" hint="選填">
            <TextArea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="指派給">
              <AssigneeField value={assignee} onChange={setAssignee} />
            </Field>
            <Field label="截止日期" hint="選填">
              <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
            </Field>
          </div>
          <Field label="優先級">
            <PriorityPicker value={priority} onChange={setPriority} />
          </Field>
          <ProjectField value={projectId} onChange={setProjectId} />
          <TaskAttachmentFields
            tags={tags}
            onTags={setTags}
            link={link}
            onLink={setLink}
            savedImages={savedImages}
            onSavedImages={setSavedImages}
            files={files}
            onFiles={setFiles}
            onPreview={setPreview}
          />
          {error ? <p className="text-sm text-stuck">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending ? "記下中…" : "加入清單"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <ImageLightbox src={preview} onClose={() => setPreview(null)} />
    </>
  );
}

export function TaskDetailDialog({
  taskId,
  onClose,
  onCompleted,
}: {
  taskId: string | null;
  onClose: () => void;
  onCompleted: (taskId: string) => void;
}) {
  const task = useApp().tasks.find((item) => item.id === taskId) ?? null;
  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        {task ? <DetailForm key={task.id} task={task} onClose={onClose} onCompleted={onCompleted} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailForm({
  task,
  onClose,
  onCompleted,
}: {
  task: Task;
  onClose: () => void;
  onCompleted: (taskId: string) => void;
}) {
  const { comments, person, updateTask, deleteTask, addComment } = useApp();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignee, setAssignee] = useState(task.assignee_id ?? "");
  const [projectId, setProjectId] = useState(task.project_id ?? "");
  const [due, setDue] = useState(task.due_date ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [stuckNote, setStuckNote] = useState(task.stuck_note ?? "");
  const [tags, setTags] = useState(task.tags);
  const [link, setLink] = useState(task.link_url ?? "");
  const [images, setImages] = useState(task.image_urls);
  const [files, setFiles] = useState<PendingImage[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const thread = comments
    .filter((item) => item.task_id === task.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (status === "stuck" && !stuckNote.trim()) {
      setError("跟對方說一下卡在哪裡");
      return;
    }
    if (link.trim() && !linkHref(link)) {
      setError("這個連結好像不完整");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const uploaded = await uploadTaskImages(
        task.space_id,
        files.map((image) => image.file),
      );
      const image_urls = [...images, ...uploaded].slice(0, 4);
      await updateTask(task.id, {
        title,
        description,
        assignee_id: assignee || null,
        due_date: due || null,
        priority,
        status,
        stuck_note: status === "stuck" ? stuckNote.trim() : task.stuck_note,
        tags,
        link_url: link,
        image_urls,
        project_id: projectId || null,
      });
      const removed = task.image_urls.filter((url) => !image_urls.includes(url));
      await deleteTaskImages(removed);
      releasePreviews(files);
      setFiles([]);
      setImages(image_urls);
      const noteChanged = stuckNote.trim() !== (task.stuck_note ?? "");
      if (status === "stuck" && (task.status !== "stuck" || noteChanged)) {
        await addComment(task.id, `卡住了：${stuckNote.trim()}`);
      }
      if (status === "completed" && task.status !== "completed") onCompleted(task.id);
      else onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function sendComment(event: React.FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    setError(null);
    try {
      await addComment(task.id, comment);
      setComment("");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <>
      <DialogTitle className="pr-8 text-xl font-bold">這件事</DialogTitle>
      <DialogDescription className="mt-1 text-sm text-cocoa">
        <span className="inline-flex items-center gap-1.5">
          <AvatarBadge name={person(task.created_by).name} mark={person(task.created_by).emoji} size="xs" />
          {person(task.created_by).name} 建立 · {formatWhen(task.created_at)}
        </span>
      </DialogDescription>
      <form className="mt-5 space-y-4" onSubmit={(event) => void save(event)}>
        <Field label="標題">
          <Input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} required />
        </Field>
        <Field label="說明">
          <TextArea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="指派給">
            <AssigneeField value={assignee} onChange={setAssignee} />
          </Field>
          <Field label="截止日期">
            <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
          </Field>
        </div>
        <Field label="優先級">
          <PriorityPicker value={priority} onChange={setPriority} />
        </Field>
        <ProjectField value={projectId} onChange={setProjectId} />
        <Field label="狀態">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={status === item}
                onClick={() => setStatus(item)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-semibold",
                  status === item
                    ? item === "stuck"
                      ? "bg-stuck text-white"
                      : item === "completed"
                        ? "bg-sage-deep text-white"
                        : "bg-ink text-cream"
                    : "bg-linen text-cocoa",
                )}
              >
                {STATUS_META[item].label}
              </button>
            ))}
          </div>
        </Field>
        {status === "stuck" ? (
          <Field label="卡在哪裡" hint="對方會在卡片上看到">
            <TextArea
              value={stuckNote}
              maxLength={200}
              placeholder="例如：售票網一直轉圈"
              onChange={(event) => setStuckNote(event.target.value)}
              required
            />
          </Field>
        ) : null}
        <TaskAttachmentFields
          tags={tags}
          onTags={setTags}
          link={link}
          onLink={setLink}
          savedImages={images}
          onSavedImages={setImages}
          files={files}
          onFiles={setFiles}
          onPreview={setPreview}
        />
        {error ? <p className="text-sm text-stuck">{error}</p> : null}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              void deleteTask(task.id)
                .then(() => deleteTaskImages(task.image_urls))
                .then(onClose)
                .catch((caught: unknown) => setError(errorMessage(caught)));
            }}
          >
            {confirmDelete ? "確定刪除？" : "刪除任務"}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              關閉
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending ? "儲存中…" : "儲存"}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-6 border-t border-sand pt-4">
        <h3 className="text-sm font-semibold">留言</h3>
        <div className="mt-3 space-y-3">
          {thread.length === 0 ? <p className="text-sm text-mist">還沒有人留言。</p> : null}
          {thread.map((item) => {
            const author = person(item.user_id);
            return (
              <div key={item.id} className="rounded-2xl bg-linen/80 px-3 py-2">
                <p className="text-xs text-mist">
                  <span className="inline-flex items-center gap-1">
                    <AvatarBadge name={author.name} mark={author.emoji} size="xs" />
                    {author.name}
                  </span>
                  <span className="text-mist"> · {formatWhen(item.created_at)}</span>
                </p>
                <p className="mt-1 text-sm leading-6">{item.body}</p>
              </div>
            );
          })}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(event) => void sendComment(event)}>
          <Input
            value={comment}
            maxLength={300}
            placeholder="留一句話"
            onChange={(event) => setComment(event.target.value)}
          />
          <Button type="submit" variant="sage" disabled={!comment.trim()}>
            送出
          </Button>
        </form>
      </div>
      <ImageLightbox src={preview} onClose={() => setPreview(null)} />
    </>
  );
}

export function StuckDialog({
  taskId,
  onClose,
}: {
  taskId: string | null;
  onClose: () => void;
}) {
  const { tasks, updateTask, addComment } = useApp();
  const task = tasks.find((item) => item.id === taskId) ?? null;
  const [note, setNote] = useState(task?.stuck_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!task) return;
    const text = note.trim();
    if (!text) {
      setError("跟對方說一下卡在哪裡");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await updateTask(task.id, { status: "stuck", stuck_note: text });
      if (task.status !== "stuck" || text !== (task.stuck_note ?? "")) {
        await addComment(task.id, `卡住了：${text}`);
      }
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle className="pr-8 text-xl font-bold">哪裡卡住了？</DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">
          {task ? `「${task.title}」會變成醒目的提醒色，對方打開清單就看得到。` : ""}
        </DialogDescription>
        <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
          <Field label="跟對方說的原因">
            <TextArea
              value={note}
              maxLength={200}
              placeholder="例如：售票網一直轉圈，要不要改場次？"
              onChange={(event) => setNote(event.target.value)}
              autoFocus
              required
            />
          </Field>
          {error ? <p className="text-sm text-stuck">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "送出中…" : "送出求救"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
