import type { NextConfig } from "next";

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
    ],
  },
};

export default nextConfig;
