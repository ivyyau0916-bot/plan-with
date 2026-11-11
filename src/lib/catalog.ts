import type { RewardCatalogItem, RewardUnlock } from "@/lib/types";

export const REWARD_CATALOG: RewardCatalogItem[] = [
  { id: "pat", name: "摸摸頭", emoji: "🐾", description: "今天也辛苦了", tier: "free" },
  { id: "boba", name: "珍奶一杯", emoji: "🧋", description: "半糖去冰，虛擬也好喝", tier: "free" },
  { id: "hug", name: "小熊抱抱", emoji: "🧸", description: "借你充電三十秒", tier: "free" },
  { id: "star", name: "星星貼紙", emoji: "⭐", description: "貼在完成的那一件上", tier: "free" },
  { id: "cocoa", name: "熱可可", emoji: "☕", description: "加一朵棉花糖", tier: "free" },
  { id: "bouquet", name: "小花束", emoji: "💐", description: "不用澆水的那種", tier: "free" },
  { id: "fireworks", name: "煙火特效", emoji: "🎆", description: "完成當下綻放", tier: "premium" },
  { id: "letter", name: "月光信封", emoji: "💌", description: "打開才看得到的話", tier: "premium" },
  { id: "sakura", name: "櫻花雨", emoji: "🌸", description: "畫面下起一陣花", tier: "premium" },
  { id: "frame", name: "金框相框", emoji: "🖼️", description: "把這件事裱起來", tier: "premium" },
];

export function catalogItem(id: string) {
  return REWARD_CATALOG.find((item) => item.id === id) ?? null;
}

export function isRewardLocked(item: RewardCatalogItem, unlocks: RewardUnlock[], userId: string) {
  if (item.tier === "free") return false;
  return !unlocks.some((unlock) => unlock.user_id === userId && unlock.catalog_id === item.id);
}
