const REEL_PATTERN = /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p)\/[A-Za-z0-9_-]+/i;

export function normalizeReelUrl(input: string) {
  const match = input.trim().match(REEL_PATTERN);
  if (!match) {
    throw new Error("請貼上 Instagram Reels 連結，例如 https://www.instagram.com/reel/...");
  }
  const url = new URL(match[0]);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("請貼上 Instagram Reels 連結，例如 https://www.instagram.com/reel/...");
  }
  url.protocol = "https:";
  url.search = "";
  url.hash = "";
  const path = url.pathname.replace(/\/+$/, "");
  return `https://www.instagram.com${path}/`;
}

export function reelUrlFromShare(input: string) {
  try {
    return normalizeReelUrl(input);
  } catch {
    return null;
  }
}

export type ReelPreview = {
  title: string;
  description: string;
  image: string | null;
  url: string;
};

export async function previewReel(url: string): Promise<ReelPreview> {
  const empty = { title: "", description: "", image: null as string | null, url };
  try {
    const response = await fetch(`/api/parse-og?url=${encodeURIComponent(url)}`);
    const data = (await response.json()) as Partial<ReelPreview>;
    return {
      title: typeof data.title === "string" && data.title !== "instagram.com" ? data.title : "",
      description: typeof data.description === "string" ? data.description : "",
      image: typeof data.image === "string" && data.image.startsWith("https://") ? data.image : null,
      url: typeof data.url === "string" ? data.url : url,
    };
  } catch {
    return empty;
  }
}
