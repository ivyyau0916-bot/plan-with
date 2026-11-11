import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const shareTarget = {
    name: "PlanWith ｜ 約定清單",
    short_name: "PlanWith",
    description: "給情侶與好友的協同任務與願望清單。",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ef",
    theme_color: "#c96a5c",
    share_target: {
      action: "/",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
  return shareTarget as MetadataRoute.Manifest;
}
