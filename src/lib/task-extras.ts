import { getSupabase } from "@/lib/supabase";

export const TASK_TAG_PRESETS = ["✈️ 機票/行程", "🏨 酒店預訂", "🎫 門票搶購", "🍽️ 餐廳/美食", "🛒 購物清單"];

export const MAX_TASK_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const BUCKET = "task-images";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const TAG_COLORS = [
  "bg-blush text-ink",
  "bg-leaf text-sage-deep",
  "bg-[#f3e4f6] text-ink",
  "bg-[#f8e7c8] text-ink",
  "bg-sand text-ink",
];

export function tagClass(tag: string) {
  let hash = 0;
  for (const char of tag) hash = (hash + char.charCodeAt(0)) % TAG_COLORS.length;
  return TAG_COLORS[hash] ?? TAG_COLORS[0];
}

export function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
    if (result.length >= 8) break;
  }
  return result;
}

export function normalizeLink(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("這個連結好像不完整");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("只接受 http 或 https 連結");
  }
  if (!url.hostname.includes(".")) throw new Error("這個連結好像不完整");
  return url.toString().slice(0, 500);
}

export function linkHref(input: string) {
  try {
    return normalizeLink(input);
  } catch {
    return null;
  }
}

function storageMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("bucket")) return "圖片庫還沒建立。請在 Supabase 再執行一次 schema.sql。";
  if (lower.includes("row-level") || lower.includes("policy") || lower.includes("not authorized")) {
    return "現在沒有權限上傳到這個空間。";
  }
  if (lower.includes("mime") || lower.includes("invalid")) return "請用 JPG、PNG、WEBP 或 GIF。";
  if (lower.includes("size") || lower.includes("large")) return "單張圖片請小於 4MB。";
  return message || "圖片沒有上傳成功";
}

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export async function uploadTaskImages(spaceId: string, files: File[]) {
  if (!files.length) return [];
  const supabase = getSupabase();
  const urls: string[] = [];
  for (const file of files) {
    if (!IMAGE_TYPES.has(file.type)) throw new Error("請用 JPG、PNG、WEBP 或 GIF。");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("單張圖片請小於 4MB。");
    const path = `${spaceId}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(storageMessage(error.message));
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

function storagePath(url: string) {
  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
}

export async function deleteTaskImages(urls: string[]) {
  const paths = urls.map(storagePath).filter((path): path is string => Boolean(path));
  if (!paths.length) return;
  await getSupabase().storage.from(BUCKET).remove(paths);
}
