import type { GiftCollection, Reward } from "@/lib/types";

export function aggregateGiftCounts(rewards: Reward[]): GiftCollection[] {
  const counts = new Map<string, GiftCollection>();
  for (const reward of rewards) {
    const key = `${reward.space_id}:${reward.to_user_id}:${reward.catalog_id}`;
    const current = counts.get(key);
    if (current) {
      current.item_count += 1;
      continue;
    }
    counts.set(key, {
      space_id: reward.space_id,
      receiver_id: reward.to_user_id,
      gift_type: reward.catalog_id,
      item_count: 1,
    });
  }
  return [...counts.values()];
}
