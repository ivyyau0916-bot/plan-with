import { connection } from "next/server";
import { parseOpenGraph } from "@/lib/og";

export async function GET(request: Request) {
  await connection();
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  try {
    const preview = await parseOpenGraph(raw);
    return Response.json(preview);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "這個連結沒辦法讀取";
    return Response.json({ title: "", description: "", image: null, url: raw, error: message }, { status: 400 });
  }
}
