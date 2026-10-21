import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
