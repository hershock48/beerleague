import type { MetadataRoute } from "next";
import { getDerived } from "@/lib/archive";
import { getPlayerIndex } from "@/lib/players";

const BASE = "https://beerleague.glazedweb.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [derived, players] = await Promise.all([getDerived(), getPlayerIndex()]);
  return [
    { url: BASE },
    { url: `${BASE}/scores` },
    { url: `${BASE}/standings` },
    { url: `${BASE}/seasons` },
    { url: `${BASE}/franchises` },
    { url: `${BASE}/players` },
    { url: `${BASE}/records` },
    { url: `${BASE}/ledger` },
    ...derived.seasons.map((s) => ({ url: `${BASE}/seasons/${s.year}` })),
    ...Object.values(derived.franchises).map((f) => ({
      url: `${BASE}/franchises/${f.slug}`,
    })),
    ...players.map((p) => ({ url: `${BASE}/players/${p.slug}` })),
  ];
}
