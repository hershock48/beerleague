import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getPlayerIndex } from "@/lib/players";
import { getDerived } from "@/lib/archive";

// All player pages are prerendered; players.json is not in the serverless
// bundle, so an unknown slug must 404 at the router instead of reaching
// this code at request time.
export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await getPlayerIndex();
  return index.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPlayer(slug);
  if (!p) return {};
  return {
    title: p.name,
    description: `${p.name}'s Beer League career: ${p.startedPts.toFixed(2)} points in ${p.startedGames} starts across ${new Set(p.stints.map((s) => s.year)).size} seasons.`,
  };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [p, index, derived] = await Promise.all([
    getPlayer(slug),
    getPlayerIndex(),
    getDerived(),
  ]);
  if (!p) notFound();

  const rank = index.find((r) => r.slug === p.slug)?.rank ?? null;
  const franchiseSlug = new Map(
    Object.values(derived.franchises).map((f) => [f.id, f.slug]),
  );
  const seasonsPlayed = new Set(p.stints.map((s) => s.year)).size;
  const isDefense = p.pos === "D/ST";

  return (
    <div>
      <p className="text-sm mb-4">
        <Link
          href="/players"
          className="text-volt underline underline-offset-4 hover:no-underline"
        >
          ← The roster wall
        </Link>
      </p>

      <div className="flex items-center gap-4 mb-1">
        {/* Playbook badge: O for the offense, X for the defense */}
        <span
          aria-hidden="true"
          className="marker text-2xl text-chalk border-2 border-chalk/50 rounded-full w-12 h-12 shrink-0 inline-flex items-center justify-center -rotate-3"
        >
          {isDefense ? "X" : "O"}
        </span>
        <h1 className="font-display text-3xl text-ink scrawl">{p.name}</h1>
      </div>
      <p className="text-steel mb-8">
        {p.pos}
        {rank && (
          <>
            {" "}
            · <span className="text-volt">no. {rank}</span> all-time scorer
          </>
        )}{" "}
        · {seasonsPlayed} {seasonsPlayed === 1 ? "season" : "seasons"} in the
        league
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="panel p-4">
          <p className="plate">Career points</p>
          <p className="text-2xl text-ink mt-1">{p.startedPts.toFixed(2)}</p>
          <p className="text-sm text-steel">as a starter</p>
        </div>
        <div className="panel p-4">
          <p className="plate">Starts</p>
          <p className="text-2xl text-ink mt-1">{p.startedGames}</p>
          <p className="text-sm text-steel">
            {p.startedGames > 0
              ? `${(p.startedPts / p.startedGames).toFixed(2)} a game`
              : "never started"}
          </p>
        </div>
        <div className="panel p-4">
          <p className="plate">Best night</p>
          <p className="text-2xl text-ink mt-1">
            {p.topGames[0] ? p.topGames[0].pts.toFixed(2) : "–"}
          </p>
          {p.topGames[0] && (
            <p className="text-sm text-steel">
              {p.topGames[0].year} week {p.topGames[0].week}
            </p>
          )}
        </div>
        <div className="panel p-4">
          <p className="plate">Benched</p>
          <p className="text-2xl text-ink mt-1">{p.benchGames}</p>
          <p className="text-sm text-steel">
            weeks · {p.benchPts.toFixed(2)} pts wasted
          </p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="plate mb-3">Property Of</h2>
          <div
            className="panel overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Seasons and teams"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-steel border-b border-edge">
                  <th className="px-4 py-2 font-normal">Year</th>
                  <th className="px-4 py-2 font-normal">Team</th>
                  <th className="px-4 py-2 font-normal text-right">Starts</th>
                  <th className="px-4 py-2 font-normal text-right">Pts</th>
                  <th className="px-4 py-2 font-normal text-right">Benched</th>
                </tr>
              </thead>
              <tbody>
                {[...p.stints].reverse().map((s, i) => (
                  <tr key={i} className="border-b border-edge last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        href={`/seasons/${s.year}`}
                        className="text-volt underline underline-offset-4 hover:no-underline"
                      >
                        {s.year}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/franchises/${franchiseSlug.get(s.teamId) ?? ""}`}
                        className="text-ink hover:text-volt"
                      >
                        {s.team}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right text-ink">
                      {s.startedGames}
                    </td>
                    <td className="px-4 py-2 text-right text-ink">
                      {s.startedPts.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-steel">
                      {s.benchGames}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {p.topGames.length > 0 && (
          <section className="min-w-0">
            <h2 className="plate mb-3">Greatest Hits</h2>
            <ol className="panel p-4 space-y-2 text-sm taped tilt-r mt-3">
              {p.topGames.map((g, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-steel">
                    <span>{i + 1}.</span> for {g.team},{" "}
                    <Link
                      href={`/seasons/${g.year}/games/${g.gameId}`}
                      className="text-volt underline underline-offset-4 hover:no-underline"
                    >
                      {g.year} wk {g.week}
                    </Link>
                    {!g.started && (
                      <span className="marker text-loss"> (on the bench!)</span>
                    )}
                  </span>
                  <span className="text-volt font-semibold">
                    {g.pts.toFixed(2)}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-steel mt-3">
              Every line links to the full box score.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
