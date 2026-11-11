import { normalizeReelUrl } from "@/lib/reels";

export type OgPreview = {
  title: string;
  description: string;
  image: string | null;
  url: string;
};

const IMAGE_HOSTS = ["cdninstagram.com", "fbcdn.net", "instagram.com"];

export async function parseOpenGraph(input: string): Promise<OgPreview> {
  const url = normalizeReelUrl(input);
  const fallback: OgPreview = { title: "instagram.com", description: "", image: null, url };
  try {
    const html = await fetchInstagramHtml(url);
    const fromHtml = html ? readOpenGraph(html) : { title: "", description: "", image: null };
    const fromEmbed =
      fromHtml.title && fromHtml.image ? null : await fetchOembed(url);
    const title = cleanText(fromHtml.title || fromEmbed?.title || "", 120);
    const description = cleanText(fromHtml.description || fromEmbed?.description || "", 300);
    const image = safeImage(fromHtml.image || fromEmbed?.image || null);
    return {
      title: title || fallback.title,
      description,
      image,
      url,
    };
  } catch {
    return fallback;
  }
}

function readOpenGraph(html: string) {
  return {
    title: metaContent(html, "og:title") || metaContent(html, "twitter:title") || "",
    description: metaContent(html, "og:description") || metaContent(html, "description") || "",
    image: metaContent(html, "og:image") || metaContent(html, "twitter:image") || null,
  };
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return "";
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function safeImage(value: string | null) {
  if (!value || !value.startsWith("https://")) return null;
  try {
    const host = new URL(value).hostname.toLowerCase();
    const allowed = IMAGE_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
    return allowed ? value : null;
  } catch {
    return null;
  }
}

function isInstagramHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "instagram.com" || host.endsWith(".instagram.com");
}

async function fetchInstagramHtml(start: string) {
  let current = start;
  for (let hop = 0; hop < 3; hop += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "facebookexternalhit/1.1",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      const next = new URL(location, current);
      if (!isInstagramHost(next.hostname)) return null;
      current = next.toString();
      continue;
    }
    if (!response.ok) return null;
    const html = await response.text();
    return html.slice(0, 600_000);
  }
  return null;
}

async function fetchOembed(reel: string) {
  try {
    const endpoint = new URL("https://www.instagram.com/oembed/");
    endpoint.searchParams.set("url", reel);
    endpoint.searchParams.set("omitscript", "true");
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      thumbnail_url?: unknown;
      title?: unknown;
      author_name?: unknown;
    };
    return {
      title: typeof data.title === "string" ? data.title : "",
      description: typeof data.author_name === "string" ? data.author_name : "",
      image: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
    };
  } catch {
    return null;
  }
}
