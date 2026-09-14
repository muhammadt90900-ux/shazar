import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The favicon. A single knot — the brand's smallest mark, and the only
 * place it appears. Without this the site shipped with the default
 * Next.js icon, which is the one thing on a fashion site nobody should
 * see in their tab.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#151713",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 48 48">
          <g fill="none" stroke="#E5DED0" strokeWidth="3">
            <path d="M24 3 L45 24 L24 45 L3 24 Z" />
          </g>
          <rect x="21" y="21" width="6" height="6" fill="#667A5B" />
        </svg>
      </div>
    ),
    size,
  );
}
