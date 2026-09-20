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

/**
 * Response headers for production. Nothing here changes how the site
 * looks; they close the common browser-side gaps: no version banner, no
 * MIME sniffing, no framing (the payment pages in particular must not be
 * embeddable), no referrer leaking an order number to a third party, and
 * HSTS once the site is served over https.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // don't advertise the framework version
  poweredByHeader: false,
  /**
   * /kurdistan was the old identity page. It is now /kurdish, and the
   * duplicate has been removed — this keeps any link that was already
   * shared from landing on a 404.
   */
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
