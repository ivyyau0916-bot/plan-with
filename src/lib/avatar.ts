import { getSupabase } from "@/lib/supabase";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;

function avatarMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("bucket")) return "頭像庫還沒建立。請在 Supabase 再執行一次 schema.sql。";
  if (lower.includes("row-level") || lower.includes("policy") || lower.includes("not authorized")) {
    return "現在沒有權限更換頭像。";
  }
  if (lower.includes("mime") || lower.includes("invalid")) return "請用 JPG 或 PNG。";
  if (lower.includes("size") || lower.includes("large")) return "頭像請小於 2MB。";
  return message || "頭像沒有上傳成功";
}

export async function uploadAvatar(file: File) {
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (type !== "image/jpeg" && type !== "image/png") throw new Error("請用 JPG 或 PNG。");
  if (file.size > MAX_BYTES) throw new Error("頭像請小於 2MB。");

  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("請先登入再更換頭像");

  const extension = type === "image/png" ? "png" : "jpg";
  const path = `${userData.user.id}/avatar.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: type,
    upsert: true,
  });
  if (error) throw new Error(avatarMessage(error.message));

  const other = extension === "png" ? "jpg" : "png";
  await supabase.storage.from(BUCKET).remove([`${userData.user.id}/avatar.${other}`]);

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return `${url}?v=${Date.now()}`;
}

export async function uploadSpaceIcon(file: File) {
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (type !== "image/jpeg" && type !== "image/png") throw new Error("請用 JPG 或 PNG。");
  if (file.size > MAX_BYTES) throw new Error("空間圖標請小於 2MB。");

  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("請先登入再更換空間圖標");

  const extension = type === "image/png" ? "png" : "jpg";
  const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("space-icons").upload(path, file, {
    contentType: type,
    upsert: false,
  });
  if (error) {
    const message = avatarMessage(error.message).replace("頭像", "空間圖標");
    throw new Error(message);
  }
  const url = supabase.storage.from("space-icons").getPublicUrl(path).data.publicUrl;
  return `${url}?v=${Date.now()}`;
}
