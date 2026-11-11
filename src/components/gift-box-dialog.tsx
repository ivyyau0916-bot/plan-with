"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AvatarBadge, GiftWell } from "@/components/mark";
import { catalogItem } from "@/lib/catalog";
import { cn, formatWhen } from "@/lib/utils";

export function GiftBoxDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, rewards, giftCounts, person } = useApp();
  const [openType, setOpenType] = useState<string | null>(null);
  const mine = giftCounts.filter((row) => row.receiver_id === me?.id && row.item_count > 0);
  const total = mine.reduce((sum, row) => sum + row.item_count, 0);
  const cards = [...mine].sort((a, b) => b.item_count - a.item_count || a.gift_type.localeCompare(b.gift_type));
  const name = me?.display_name ?? "我";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setOpenType(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogTitle className="pr-8 text-xl font-bold">{name} 的禮物收集箱</DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-6 text-cocoa">累計收到 {total} 份小獎勵</DialogDescription>

        {cards.length === 0 ? (
          <p className="mt-5 rounded-3xl bg-white/70 px-4 py-6 text-center text-sm leading-6 text-cocoa">
            禮物箱還空空的。完成任務之後，對方可以送一份進來。
          </p>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((row) => {
              const item = catalogItem(row.gift_type);
              const history = rewards
                .filter((reward) => reward.to_user_id === me?.id && reward.catalog_id === row.gift_type)
                .sort((a, b) => b.created_at.localeCompare(a.created_at));
              const expanded = openType === row.gift_type;
              return (
                <li key={row.gift_type} className={cn(expanded && "col-span-2 sm:col-span-3")}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpenType(expanded ? null : row.gift_type)}
                    className={cn(
                      "relative w-full rounded-3xl border border-sand bg-white px-3 py-4 text-left shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition hover:border-rose",
                      expanded && "border-coral bg-blush/40",
                    )}
                  >
                    <GiftWell id={row.gift_type} size="md" />
                    <span className="mt-2 block text-sm font-semibold">{item?.name ?? "小獎勵"}</span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-cream">
                      x {row.item_count}
                    </span>
                  </button>
                  {expanded ? (
                    <ul className="mt-2 space-y-1.5 rounded-2xl bg-white/80 px-3 py-2">
                      {history.length === 0 ? (
                        <li className="text-xs text-mist">這份禮物的紀錄還在路上。</li>
                      ) : (
                        history.map((reward) => {
                          const from = person(reward.from_user_id);
                          return (
                            <li key={reward.id} className="text-xs leading-5 text-cocoa">
                              <span className="font-semibold text-ink">
                                <span className="inline-flex items-center gap-1">
                                  <AvatarBadge name={from.name} mark={from.emoji} size="xs" />
                                  {from.name}
                                </span>
                              </span>
                              <span className="text-mist"> · {formatWhen(reward.created_at)}</span>
                              {reward.message ? <span className="block text-cocoa">{reward.message}</span> : null}
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
