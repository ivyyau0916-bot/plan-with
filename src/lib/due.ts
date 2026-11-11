export type DueHorizon = "today" | "tomorrow";

export function dueHorizon(due: string | null | undefined): DueHorizon | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(due ?? "");
  if (!match) return null;
  const dueDay = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return null;
}

export function duePhrase(kind: DueHorizon) {
  return kind === "today" ? "今天" : "明天";
}
