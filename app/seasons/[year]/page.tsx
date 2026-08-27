import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDerived,
  getSeason,
  getSeasonGames,
  getDraftBoard,
} from "@/lib/archive";

export async function generateStaticParams() {
  const derived = await getDerived();
  return derived.seasons.map((s) => ({ year: String(s.year) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  const season = await getSeason(Number(year));
  return {
    title: `${year} Season`,
    description: season?.champion
      ? `The ${year} Beer League season: ${season.champion.name} took the title.`
      : `The ${year} Beer League season: standings, playoffs and results.`,
  };
}

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  const [season, derived, games, draft] = await Promise.all([
    getSeason(year),
    getDerived(),
    getSeasonGames(year),
    getDraftBoard(year),
  ]);
  if (!season) notFound();
  const weeks = [...new Set(games.map((g) => g.week))].sort((a, b) => a - b);
  const rounds = [...new Set(draft.map((p) => p.round))].sort((a, b) => a - b);

  const slugOf = new Map(
    Object.values(derived.franchises).map((f) => [f.id, f.slug]),
  );
  const years = derived.seasons.map((s) => s.year);
  const idx = years.indexOf(year);
  const newer = idx > 0 ? years[idx - 1] : null;
  const older = idx < years.length - 1 ? years[idx + 1] : null;

  // Group playoff games by week for a readable bracket-in-rounds
  const playoffWeeks = [...new Set(season.playoffGames.map((g) => g.week))].sort(
    (a, b) => a - b,
  );

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 gap-4">
        <h1 className="font-display text-3xl text-cream">{year}</h1>
        <p className="text-sm flex gap-4">
          {older && (
            <Link href={`/seasons/${older}`} className="text-amber underline underline-offset-4 hover:no-underline">
              ← {older}
            </Link>
          )}
          {newer && (
            <Link href={`/seasons/${newer}`} className="text-amber underline underline-offset-4 hover:no-underline">
              {newer} →
            </Link>
          )}
        </p>
      </div>

      {season.champion && (
        <div className="panel border-amber/40 p-5 mb-8">
          <p className="plate mb-1">League Champion</p>
          <p className="font-display text-2xl text-amber glow">
            {season.champion.name}
          </p>
          <p className="text-parch text-sm mt-1">
            {season.champion.owner && <>{season.champion.owner} · </>}
            {season.champion.record} regular season
            {season.runnerUp && <> · beat {season.runnerUp.name} in the final</>}
          </p>
        </div>
      )}
      {season.isCurrent && (
        <p className="text-parch mb-8">
          Season in progress. The board fills in as games finish; live scores
          are in <Link href="/scores" className="text-amber underline underline-offset-4 hover:no-underline">Scores</Link>.
        </p>
      )}

      {/* min-w-0: same grid-track shrink fix as the franchise page */}
      <div className="grid gap-10 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="plate mb-3">Final Standings</h2>
          <div className="space-y-6">
            {season.standings.map((div) => (
              <div key={div.name} className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={`${div.name} final standings`}>
                <table className="w-full text-sm">
                  <caption className="text-left text-cream font-semibold px-4 pt-3 pb-1">
                    {div.name}
                  </caption>
                  <thead>
                    <tr className="text-left text-parch border-b border-edge">
                      <th className="px-4 py-2 font-normal">Team</th>
                      <th className="px-4 py-2 font-normal">Record</th>
                      <th className="px-4 py-2 font-normal text-right">PF</th>
                      <th className="px-4 py-2 font-normal text-right">PA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {div.teams.map((t) => (
                      <tr key={t.id} className="border-b border-edge last:border-0">
                        <td className="px-4 py-2">
                          <Link
                            href={`/franchises/${slugOf.get(t.id) ?? ""}`}
                            className="text-cream hover:text-amber"
                          >
                            {t.isChampion && "🏆 "}
                            {t.name}
                          </Link>
                          {t.owner && (
                            <span className="text-parch"> · {t.owner}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-cream">{t.record}</td>
                        <td className="px-4 py-2 text-right text-cream">{t.pf}</td>
                        <td className="px-4 py-2 text-right text-parch">{t.pa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {playoffWeeks.length > 0 && (
          <section className="min-w-0">
            <h2 className="plate mb-3">Playoffs</h2>
            <div className="space-y-4">
              {playoffWeeks.map((wk, i) => (
                <div key={wk} className="panel p-4">
                  <p className="text-sm text-cream font-semibold mb-2">
                    {i === playoffWeeks.length - 1
                      ? "Championship week"
                      : `Round ${i + 1}`}
                    <span className="text-parch font-normal"> · week {wk}</span>
                  </p>
                  <ul className="space-y-2 text-sm">
                    {season.playoffGames
                      .filter((g) => g.week === wk)
                      .map((g, gi) => {
                        const awayWon = g.away.pts > g.home.pts;
                        return (
                          <li key={gi} className="flex flex-wrap gap-x-2">
                            <span className={awayWon ? "text-cream font-semibold" : "text-parch"}>
                              {g.away.name} {g.away.pts.toFixed(2)}
                            </span>
                            <span className="text-parch">at</span>
                            <span className={awayWon ? "text-parch" : "text-cream font-semibold"}>
                              {g.home.name} {g.home.pts.toFixed(2)}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-parch mt-3">
              Playoff weeks include consolation games; the title game is the one
              between the two teams that finished first and second.
            </p>
          </section>
        )}
      </div>

      {weeks.length > 0 && (
        <section className="mt-12">
          <h2 className="plate mb-4">Every Game, Every Week</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weeks.map((wk) => (
              <div key={wk} className="panel p-4 min-w-0">
                <p className="text-sm text-cream font-semibold mb-2">
                  Week {wk}
                  {wk > season.regularWeeks && (
                    <span className="text-amber font-normal"> · playoffs</span>
                  )}
                </p>
                <ul className="space-y-1.5 text-sm">
                  {games
                    .filter((g) => g.week === wk)
                    .map((g) => {
                      const awayWon = g.away.pts > g.home.pts;
                      return (
                        <li key={g.id}>
                          <Link
                            href={`/seasons/${year}/games/${g.id}`}
                            className="flex justify-between gap-2 hover:text-amber text-parch"
                          >
                            <span className="truncate">
                              <span className={awayWon ? "text-cream" : undefined}>
                                {g.away.name}
                              </span>{" "}
                              at{" "}
                              <span className={awayWon ? undefined : "text-cream"}>
                                {g.home.name}
                              </span>
                            </span>
                            <span className="whitespace-nowrap">
                              {g.away.pts.toFixed(1)}–{g.home.pts.toFixed(1)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-parch mt-3">
            Every score links to the full box score, lineups and all.
          </p>
        </section>
      )}

      {rounds.length > 0 && (
        <section className="mt-12">
          <h2 className="plate mb-4">Draft Board</h2>
          {/* Fleaflicker's early records are spotty: 2012 survives as one
              round of ten picks. Present partial data as partial. */}
          {draft.length < season.teamCount * 3 && (
            <p className="text-sm text-parch mb-3">
              Only part of this draft survives in Fleaflicker&apos;s records;
              this is everything it still has.
            </p>
          )}
          {/* Native details: collapsed in the server HTML and opens without
              JavaScript, so there is no hydration layout shift. */}
          <div className="space-y-2">
            {rounds.map((round) => (
              <details key={round} className="panel" open={round === 1}>
                <summary className="cursor-pointer px-4 py-3 text-cream text-sm font-semibold">
                  Round {round}
                </summary>
                <ol className="px-4 pb-4 grid gap-x-8 gap-y-1 sm:grid-cols-2 text-sm">
                  {draft
                    .filter((p) => p.round === round)
                    .map((p, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-cream truncate">
                          {p.player}{" "}
                          <span className="text-parch text-xs">{p.pos}</span>
                        </span>
                        <span className="text-parch truncate">{p.team}</span>
                      </li>
                    ))}
                </ol>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
