import type { NextConfig } from "next";

/**
 * Product photography uploaded through the admin is served from the
 * Supabase Storage bucket. next/image refuses any host it has not been
 * told about, so the project's own storage host is allowed here — read
 * from the same public variable the app already uses, and limited to the
 * public object path.
 */
const supabaseHost = (() => {
  try {
    const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/^["']|["']$/g, "");
    return raw ? new URL(raw).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * /kurdistan was the old identity page. It is now /kurdish, and the
   * duplicate has been removed — this keeps any link that was already
   * shared from landing on a 404.
   */
  async redirects() {
    return [{ source: "/kurdistan", destination: "/kurdish", permanent: true }];
  },
  images: {
    /**
     * Prototype photography. Replace these with your own shoot by editing
     * src/data/images.ts — nothing else needs to change.
     */
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
};

export default nextConfig;
