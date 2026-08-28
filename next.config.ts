import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dynamic routes (home, standings, scores, sitemap) read
  // data/derived.json at request time through lib/archive.ts. Vercel's file
  // tracer cannot follow a path built with process.cwd(), so without this
  // the file is missing from the serverless bundle and every dynamic route
  // 500s in production while working perfectly locally.
  //
  // Only derived.json and the slim player-slug map are included,
  // deliberately: the raw archive in data/ is ~50x larger and nothing reads
  // it at request time. If a page ever starts reading data/seasons/** or
  // data/players.json at runtime, it must be added here.
  outputFileTracingIncludes: {
    "/": ["data/derived.json", "data/player-slugs.json"],
    "/*": ["data/derived.json", "data/player-slugs.json"],
    "/**": ["data/derived.json", "data/player-slugs.json"],
  },
};

export default nextConfig;
