import type { MetadataRoute } from "next";

export const SITE_URL = "https://arogya-relay.local";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://arogya-relay.local/sitemap.xml",
  };
}
