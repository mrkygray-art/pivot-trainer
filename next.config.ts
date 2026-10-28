import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packs are read from disk at request time; make sure Vercel ships them with the API routes.
  outputFileTracingIncludes: {
    "/api/**": ["./packs/**/*"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
