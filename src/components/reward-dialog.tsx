"use client";

import { Lock } from "@phosphor-icons/react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/input";
import { GiftWell } from "@/components/mark";
import { catalogItem, isRewardLocked, REWARD_CATALOG } from "@/lib/catalog";
import { cn, errorMessage } from "@/lib/utils";

export function RewardDialog({
  taskId,
  onClose,
  onSent,
}: {
  taskId: string | null;
  onClose: () => void;
  onSent: (emoji: string) => void;
}) {
  const { tasks, members, me, unlocks, person, sendReward } = useApp();
  const task = tasks.find((item) => item.id === taskId) ?? null;
  const others = members.filter((member) => member.user_id !== me?.id);
  const suggested =
    task?.assignee_id && task.assignee_id !== me?.id ? task.assignee_id : (others[0]?.user_id ?? "");
  const [recipient, setRecipient] = useState(suggested);
  const [selected, setSelected] = useState("boba");
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const activeRecipient = recipient || suggested;

  async function submit() {
    if (!task || !me || !activeRecipient) return;
    const gift = catalogItem(selected);
    if (!gift || isRewardLocked(gift, unlocks, me.id)) {
      setHint("這份禮物還鎖著");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await sendReward({
        task_id: task.id,
        to_user_id: activeRecipient,
        catalog_id: gift.id,
        message,
      });
      onSent(gift.id);
      setMessage("");
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const recipientName = person(activeRecipient).name;
  const thankingAssignee = task?.assignee_id === activeRecipient;

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogTitle className="pr-8 text-xl font-bold">任務完成啦，要送一份小獎勵嗎？</DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">
          {task
            ? thankingAssignee
              ? `送給${recipientName}，謝謝完成「${task.title}」。`
              : `要回贈一份給${recipientName}嗎？「${task.title}」已經完成了。`
            : ""}
        </DialogDescription>

        {others.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-linen px-4 py-3 text-sm leading-6 text-cocoa">
            空間裡還沒有另一個人。先把邀請碼給對方，之後就能送電子禮物。
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {others.length > 1 ? (
              <Field label="送給">
                <select
                  className="w-full rounded-2xl border border-sand bg-white px-3.5 py-2.5 text-sm"
                  value={activeRecipient}
                  onChange={(event) => setRecipient(event.target.value)}
                >
                  {others.map((member) => {
                    const profile = person(member.user_id);
                    return (
                      <option key={member.user_id} value={member.user_id}>
                        {profile.name}
                      </option>
                    );
                  })}
                </select>
              </Field>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REWARD_CATALOG.map((item) => {
                const locked = me ? isRewardLocked(item, unlocks, me.id) : item.tier === "premium";
                const active = selected === item.id && !locked;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (locked) {
                        setHint("付費禮物即將開放，先把位子留好了。");
                        setSelected("");
                        return;
                      }
                      setHint(null);
                      setSelected(item.id);
                    }}
                    className={cn(
                      "relative rounded-3xl border px-3 py-3 text-left shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition",
                      active ? "border-coral bg-blush/50" : "border-sand bg-white",
                      locked && "bg-linen/70",
                    )}
                  >
                    <GiftWell id={item.id} size="sm" />
                    <span className="mt-1 block text-sm font-semibold">{item.name}</span>
                    <span className="mt-0.5 block text-xs leading-4 text-mist">{item.description}</span>
                    {locked ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-cocoa">
                        <Lock className="h-3 w-3" weight="bold" />
                        即將推出
                      </span>
                    ) : (
                      <span className="mt-2 block text-[11px] font-semibold text-sage-deep">免費</span>
                    )}
                  </button>
                );
              })}
            </div>

            <Field label="想跟對方說的話" hint="可以留白">
              <TextArea
                value={message}
                maxLength={120}
                placeholder="例如：今天換我洗碗。"
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>
            {hint ? <p className="text-sm text-cocoa">{hint}</p> : null}
            {error ? <p className="text-sm text-stuck">{error}</p> : null}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            先不用送
          </Button>
          <Button type="button" disabled={pending || others.length === 0 || !selected} onClick={() => void submit()}>
            {pending ? "送出中…" : "送出獎勵"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
