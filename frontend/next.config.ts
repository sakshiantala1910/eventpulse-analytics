import path from "path";
import type { NextConfig } from "next";

// Lets the dev server be opened from another device on the LAN (e.g. testing
// on a phone at this machine's local IP) without Next.js blocking the
// request as a cross-origin dev resource. Comma-separated, machine-specific,
// so it lives in .env.local rather than being hardcoded here.
const allowedDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  // The dashboard fetches fresh, request-scoped data (date-range filters via
  // searchParams, a server-only API key); keep the conventional dynamic
  // rendering model instead of Next 16's new cache-components opt-in.
  turbopack: {
    // @eventpulse/browser-sdk is a sibling package (packages/browser-sdk),
    // not inside this app's directory. Turbopack refuses to resolve files
    // outside its root by default, so widen the root to the monorepo root.
    root: path.join(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
