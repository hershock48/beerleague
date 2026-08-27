import type { MetadataRoute } from "next";
import { getDerived } from "@/lib/archive";

const BASE = "https://beerleague.glazedweb.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const derived = await getDerived();
  return [
    { url: BASE },
    { url: `${BASE}/scores` },
    { url: `${BASE}/standings` },
    { url: `${BASE}/seasons` },
    { url: `${BASE}/franchises` },
    { url: `${BASE}/records` },
    ...derived.seasons.map((s) => ({ url: `${BASE}/seasons/${s.year}` })),
    ...Object.values(derived.franchises).map((f) => ({
      url: `${BASE}/franchises/${f.slug}`,
    })),
  ];
}
