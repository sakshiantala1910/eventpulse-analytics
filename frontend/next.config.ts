import path from "path";
import type { NextConfig } from "next";

// Lets the dev server be opened from another LAN device (e.g. a phone) without Next.js blocking it as cross-origin.
const allowedDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  // Dashboard needs request-scoped data (date-range searchParams, a server-only API key), so skip Next 16's cache-components opt-in.
  turbopack: {
    // @eventpulse/browser-sdk is a sibling package outside this app's directory; widen Turbopack's root to resolve it.
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
