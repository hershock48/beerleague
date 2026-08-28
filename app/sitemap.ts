import type { MetadataRoute } from "next";
import { getDerived } from "@/lib/archive";
import { getPlayerIndex } from "@/lib/players";
import { getArchivedRecapWeeks } from "@/lib/recapData";

const BASE = "https://beerleague.glazedweb.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [derived, players] = await Promise.all([getDerived(), getPlayerIndex()]);
  const recaps: MetadataRoute.Sitemap = [];
  for (const s of derived.seasons) {
    if (s.isCurrent) continue;
    for (const w of await getArchivedRecapWeeks(s.year)) {
      recaps.push({ url: `${BASE}/recaps/${s.year}/${w.week}` });
    }
  }
  return [
    { url: BASE },
    { url: `${BASE}/scores` },
    { url: `${BASE}/standings` },
    { url: `${BASE}/draft` },
    { url: `${BASE}/rankings` },
    { url: `${BASE}/recaps` },
    { url: `${BASE}/seasons` },
    { url: `${BASE}/franchises` },
    { url: `${BASE}/players` },
    { url: `${BASE}/records` },
    { url: `${BASE}/ledger` },
    { url: `${BASE}/shame` },
    ...recaps,
    ...derived.seasons.map((s) => ({ url: `${BASE}/seasons/${s.year}` })),
    ...Object.values(derived.franchises).map((f) => ({
      url: `${BASE}/franchises/${f.slug}`,
    })),
    ...players.map((p) => ({ url: `${BASE}/players/${p.slug}` })),
  ];
}
