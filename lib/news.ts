// League news and waiver buzz, server-side.
//
// News: ESPN's NFL headlines cross-referenced against every Beer League
// roster, so the feed can filter to "news about MY guys." Matching is by
// text: an article mentions a rostered player's full name, or an NFL team
// (full "Denver Broncos" form) that a rostered player plays for. ESPN's
// category IDs are a different ID space from Fleaflicker's, so name matching
// is the robust join. Both ESPN's and Sleeper's are public no-key APIs; if
// either goes away, these return empty and the sections hide themselves.
import "server-only";
import { getRosters } from "./live";

export interface NewsItem {
  headline: string;
  description: string;
  published: string;
  url: string;
  image: string | null;
  matches: { teamId: number; via: string }[];
}

interface EspnArticle {
  headline?: string;
  description?: string;
  published?: string;
  links?: { web?: { href?: string } };
  images?: { url?: string; width?: number }[];
}

export async function getNews(): Promise<NewsItem[]> {
  const [espnRes, rosters] = await Promise.all([
    fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=50",
      { next: { revalidate: 900 } },
    ).catch(() => null),
    getRosters(),
  ]);
  if (!espnRes?.ok) return [];
  const espn = (await espnRes.json()) as { articles?: EspnArticle[] };

  const lookups = rosters.map((r) => ({
    teamId: r.team.id,
    players: r.players.map((p) => p.proPlayer.nameFull),
    nflTeams: [
      ...new Set(
        r.players
          .map((p) =>
            p.proPlayer.proTeam
              ? `${p.proPlayer.proTeam.location} ${p.proPlayer.proTeam.name}`
              : null,
          )
          .filter((t): t is string => t !== null),
      ),
    ],
  }));

  return (espn.articles ?? []).map((a) => {
    const text = `${a.headline ?? ""} ${a.description ?? ""}`;
    const matches: NewsItem["matches"] = [];
    for (const team of lookups) {
      const player = team.players.find((name) => text.includes(name));
      if (player) {
        matches.push({ teamId: team.teamId, via: player });
        continue;
      }
      const nfl = team.nflTeams.find((name) => text.includes(name));
      if (nfl) matches.push({ teamId: team.teamId, via: nfl });
    }
    const image =
      a.images?.find((i) => (i.width ?? 0) >= 400)?.url ?? a.images?.[0]?.url ?? null;
    return {
      headline: a.headline ?? "",
      description: a.description ?? "",
      published: a.published ?? "",
      url: a.links?.web?.href ?? "",
      image,
      matches,
    };
  });
}

export interface TrendingPlayer {
  name: string;
  position: string;
  nflTeam: string;
  adds: number;
}

// Sleeper's full player database is ~10MB they ask you to fetch at most daily;
// the fetch data cache holds it for 24h. Trending itself refreshes hourly.
export async function getTrending(): Promise<TrendingPlayer[]> {
  const [trendRes, playersRes] = await Promise.all([
    fetch("https://api.sleeper.app/v1/players/nfl/trending/add?limit=12", {
      next: { revalidate: 3600 },
    }).catch(() => null),
    fetch("https://api.sleeper.app/v1/players/nfl", {
      next: { revalidate: 86400 },
    }).catch(() => null),
  ]);
  if (!trendRes?.ok || !playersRes?.ok) return [];

  const trending = (await trendRes.json()) as { player_id: string; count: number }[];
  const players = (await playersRes.json()) as Record<
    string,
    { full_name?: string; position?: string; team?: string | null }
  >;

  return trending
    .map((t) => {
      const p = players[t.player_id];
      if (!p?.full_name || !p.position) return null;
      return {
        name: p.full_name,
        position: p.position,
        nflTeam: p.team ?? "FA",
        adds: t.count,
      };
    })
    .filter((p): p is TrendingPlayer => p !== null)
    .slice(0, 8);
}
