import type { Metadata } from "next";
import Link from "next/link";
import { getScoreboard, type Scoreboard } from "@/lib/live";
import { getAnalytics } from "@/lib/analytics";
import { getDerived } from "@/lib/archive";
import { CURRENT_SEASON } from "@/lib/league";

// The Power Poll: Oberon Mt. ratings (6x average score, 2x high plus low,
// 2x win percentage x 200 - the formula the fantasy commons actually uses)
// plus Monte Carlo playoff odds once real games exist. Before week 1 it
// falls back, labeled, to last season's final ratings. Renders per request;
// the fetch caches throttle Fleaflicker as usual.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Power Poll",
  description:
    "The Beer League power rankings: Oberon ratings and Monte Carlo playoff odds, refreshed as the season pours.",
};

const REGULAR_WEEKS = 13;
const SIMS = 5000;

interface TeamSeason {
  id: number;
  name: string;
  pts: number[];
  w: number;
  l: number;
}

// Deterministic PRNG (mulberry32) so the same standings always produce the
// same odds; Math.random would make the page disagree with itself between
// requests for no reason a reader could see.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default async function RankingsPage() {
  const [analytics, derived] = await Promise.all([getAnalytics(), getDerived()]);
  const slugOf = new Map(
    Object.values(derived.franchises).map((f) => [f.id, f.slug]),
  );

  // Collect the current season's completed games and remaining schedule.
  const teams = new Map<number, TeamSeason>();
  const remaining: { away: number; home: number }[] = [];
  const boards: (Scoreboard | null)[] = [];
  for (let w = 1; w <= REGULAR_WEEKS; w++) boards.push(await getScoreboard(w));
  for (const board of boards) {
    for (const g of board?.games ?? []) {
      for (const side of [g.away, g.home]) {
        if (!teams.has(side.id)) {
          teams.set(side.id, { id: side.id, name: side.name, pts: [], w: 0, l: 0 });
        }
      }
      const as = g.awayScore?.score?.value;
      const hs = g.homeScore?.score?.value;
      if (g.isFinalScore && as !== undefined && hs !== undefined) {
        const a = teams.get(g.away.id)!;
        const h = teams.get(g.home.id)!;
        a.pts.push(as); h.pts.push(hs);
        if (as > hs) { a.w++; h.l++; } else if (hs > as) { h.w++; a.l++; }
      } else {
        remaining.push({ away: g.away.id, home: g.home.id });
      }
    }
  }
  const played = [...teams.values()].filter((t) => t.pts.length > 0);

  if (played.length === 0) {
    // Preseason: last season's final ratings, plainly labeled.
    const poll = analytics.preseason?.poll ?? [];
    return (
      <div>
        <h1 className="font-display text-3xl text-ice mb-2 scrawl">
          The Power Poll
        </h1>
        <p className="text-steel mb-8 max-w-2xl">
          No {CURRENT_SEASON} games yet, so this is the {analytics.preseason?.year}{" "}
          final Oberon ratings: what everyone walks into the season carrying.
          Real rankings and playoff odds take over when week 1 goes final.
        </p>
        <div className="panel overflow-x-auto max-w-2xl" tabIndex={0} role="region" aria-label="Preseason power poll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-steel border-b border-edge">
                <th className="px-4 py-3 font-normal">#</th>
                <th className="px-4 py-3 font-normal">Franchise</th>
                <th className="px-4 py-3 font-normal text-right">Rating</th>
                <th className="px-4 py-3 font-normal text-right">
                  {analytics.preseason?.year} record
                </th>
                <th className="px-4 py-3 font-normal text-right">Avg</th>
              </tr>
            </thead>
            <tbody>
              {poll.map((p, i) => (
                <tr key={p.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-2 text-steel">{i + 1}</td>
                  <td className="px-4 py-2">
                    <Link href={`/franchises/${p.slug}`} className="text-ice hover:text-volt">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right text-volt">{p.rating}</td>
                  <td className="px-4 py-2 text-right text-steel">{p.record}</td>
                  <td className="px-4 py-2 text-right text-steel">{p.avg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // In-season: Oberon ratings on real games.
  const leagueScores = played.flatMap((t) => t.pts);
  const leagueMean = leagueScores.reduce((a, b) => a + b, 0) / leagueScores.length;
  const leagueSd = Math.sqrt(
    leagueScores.reduce((a, b) => a + (b - leagueMean) ** 2, 0) / leagueScores.length,
  ) || 12;

  const rated = played.map((t) => {
    const avg = t.pts.reduce((a, b) => a + b, 0) / t.pts.length;
    const rating =
      avg * 6 +
      (Math.max(...t.pts) + Math.min(...t.pts)) * 2 +
      (t.w + t.l > 0 ? t.w / (t.w + t.l) : 0.5) * 200 * 2;
    // Shrink each team's model toward the league early in the year, so a
    // 2-0 team is not simulated as a juggernaut off two data points.
    const K = 4;
    const mean = (avg * t.pts.length + leagueMean * K) / (t.pts.length + K);
    return { ...t, avg, rating: Math.round(rating * 10) / 10, mean };
  });

  // Monte Carlo the rest of the regular season for playoff odds (top 6 by
  // wins, points-for tiebreak).
  const rand = rng(
    rated.reduce((a, t) => a + t.w * 31 + Math.round(t.avg * 7), CURRENT_SEASON),
  );
  const berths = new Map<number, number>(rated.map((t) => [t.id, 0]));
  const winsAcc = new Map<number, number>(rated.map((t) => [t.id, 0]));
  for (let s = 0; s < SIMS; s++) {
    const wins = new Map(rated.map((t) => [t.id, t.w]));
    const pf = new Map(
      rated.map((t) => [t.id, t.pts.reduce((a, b) => a + b, 0)]),
    );
    for (const g of remaining) {
      const a = rated.find((t) => t.id === g.away);
      const h = rated.find((t) => t.id === g.home);
      if (!a || !h) continue;
      const as = a.mean + gaussian(rand) * leagueSd;
      const hs = h.mean + gaussian(rand) * leagueSd;
      pf.set(a.id, (pf.get(a.id) ?? 0) + as);
      pf.set(h.id, (pf.get(h.id) ?? 0) + hs);
      if (as > hs) wins.set(a.id, (wins.get(a.id) ?? 0) + 1);
      else wins.set(h.id, (wins.get(h.id) ?? 0) + 1);
    }
    const order = [...wins.entries()].sort(
      (x, y) => y[1] - x[1] || (pf.get(y[0]) ?? 0) - (pf.get(x[0]) ?? 0),
    );
    order.slice(0, 6).forEach(([id]) => berths.set(id, (berths.get(id) ?? 0) + 1));
    for (const [id, w] of wins) winsAcc.set(id, (winsAcc.get(id) ?? 0) + w);
  }

  const rows = rated
    .map((t) => ({
      ...t,
      odds: Math.round(((berths.get(t.id) ?? 0) / SIMS) * 1000) / 10,
      projWins: Math.round(((winsAcc.get(t.id) ?? 0) / SIMS) * 10) / 10,
    }))
    .sort((a, b) => b.rating - a.rating);

  return (
    <div>
      <h1 className="font-display text-3xl text-ice mb-2 scrawl">
        The Power Poll
      </h1>
      <p className="text-steel mb-8 max-w-2xl">
        Oberon ratings on the season so far, and playoff odds from{" "}
        {SIMS.toLocaleString("en-US")} simulations of what is left. Recomputed
        every time the scores move.
      </p>
      <div className="panel overflow-x-auto max-w-3xl" tabIndex={0} role="region" aria-label="Power poll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-steel border-b border-edge">
              <th className="px-4 py-3 font-normal">#</th>
              <th className="px-4 py-3 font-normal">Franchise</th>
              <th className="px-4 py-3 font-normal text-right">Rating</th>
              <th className="px-4 py-3 font-normal text-right">Record</th>
              <th className="px-4 py-3 font-normal text-right">Avg</th>
              <th className="px-4 py-3 font-normal text-right">Proj W</th>
              <th className="px-4 py-3 font-normal text-right">Playoffs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.id} className="border-b border-edge last:border-0">
                <td className="px-4 py-2 text-steel">{i + 1}</td>
                <td className="px-4 py-2">
                  <Link
                    href={`/franchises/${slugOf.get(t.id) ?? ""}`}
                    className="text-ice hover:text-volt"
                  >
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right text-volt">{t.rating}</td>
                <td className="px-4 py-2 text-right text-ice">{t.w}-{t.l}</td>
                <td className="px-4 py-2 text-right text-steel">{t.avg.toFixed(1)}</td>
                <td className="px-4 py-2 text-right text-steel">{t.projWins}</td>
                <td
                  className={`px-4 py-2 text-right ${
                    t.odds >= 60 ? "text-win" : t.odds < 25 ? "text-loss" : "text-ice"
                  }`}
                >
                  {t.odds}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-steel mt-3 max-w-3xl">
        Rating: 6x average score, 2x best-plus-worst week, 2x win percentage
        x 200. Odds: each team simulated as its shrunk scoring average plus
        league-wide noise; top six by wins make it, points for breaks ties.
      </p>
    </div>
  );
}
