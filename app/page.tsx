import Link from "next/link";
import LiveScoreboard from "@/components/LiveScoreboard";
import NewsFeed from "@/components/NewsFeed";
import { getScoreboard, getStandings, getTransactions } from "@/lib/live";
import { getNews, getTrending } from "@/lib/news";
import { getDerived } from "@/lib/archive";
import { CURRENT_SEASON } from "@/lib/league";

// The tap room shows live scores and this-hour news; it renders per request
// (glaze.md: route caching and time do not mix). The fetch caches in lib/
// keep the upstream calls throttled regardless of traffic.
export const dynamic = "force-dynamic";

function timeAgo(epochMilli: string | undefined): string | null {
  if (!epochMilli) return null;
  const mins = Math.floor((Date.now() - Number(epochMilli)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TX_LABELS: Record<string, string> = {
  TRANSACTION_ADD: "added",
  TRANSACTION_DROP: "dropped",
  TRANSACTION_CLAIM: "claimed",
  TRANSACTION_TRADE: "traded",
};

export default async function Home() {
  const [board, standings, transactions, news, trending, derived] =
    await Promise.all([
      getScoreboard(),
      getStandings(),
      getTransactions(),
      getNews(),
      getTrending(),
      getDerived(),
    ]);

  const week = board?.schedulePeriod?.value ?? null;
  const teams =
    standings?.divisions?.flatMap((d) =>
      d.teams.map((t) => ({ id: t.id, name: t.name })),
    ) ?? [];
  const lastChamp = derived.seasons.find((s) => s.champion)?.champion ?? null;
  const lastChampYear = derived.seasons.find((s) => s.champion)?.year ?? null;

  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-display text-3xl sm:text-4xl text-cream mb-1">
          The Tap Room
        </h1>
        <p className="text-parch mb-6">
          Season {CURRENT_SEASON}.{" "}
          {lastChamp && lastChampYear && (
            <>
              Defending champion: <span className="text-amber">{lastChamp.name}</span>{" "}
              ({lastChampYear}).
            </>
          )}
        </p>
        {board ? (
          <LiveScoreboard initial={board} week={week} />
        ) : (
          <p className="text-parch">
            Fleaflicker is not answering right now. The board will refill when
            it does.
          </p>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
        <section>
          <h2 className="plate mb-4">Around the League</h2>
          {news.length > 0 ? (
            <NewsFeed items={news} teams={teams} />
          ) : (
            <p className="text-parch">The news wire is quiet.</p>
          )}
        </section>

        <div className="space-y-10">
          <section>
            <h2 className="plate mb-3">Standings</h2>
            {standings?.divisions ? (
              <div className="panel divide-y divide-edge">
                {standings.divisions.map((div) => (
                  <div key={div.id} className="p-4">
                    <h3 className="text-sm text-cream font-semibold mb-2">
                      {div.name}
                    </h3>
                    <ol className="space-y-1 text-sm">
                      {div.teams.map((t) => (
                        <li key={t.id} className="flex justify-between gap-2">
                          <span className="text-parch">{t.name}</span>
                          <span className="text-cream">
                            {t.recordOverall.formatted}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-parch text-sm">Standings unavailable.</p>
            )}
            <Link
              href="/standings"
              className="inline-block mt-2 text-sm text-amber underline underline-offset-4 hover:no-underline"
            >
              Full standings
            </Link>
          </section>

          {trending.length > 0 && (
            <section>
              <h2 className="plate mb-3">Waiver Wire Buzz</h2>
              <p className="text-xs text-parch mb-2">
                Most-added players across all fantasy leagues, last 24 hours.
              </p>
              <ol className="panel p-4 space-y-2 text-sm">
                {trending.map((p) => (
                  <li key={p.name} className="flex justify-between gap-2">
                    <span className="text-cream">
                      {p.name}{" "}
                      <span className="text-parch">
                        {p.position} · {p.nflTeam}
                      </span>
                    </span>
                    <span className="text-parch">
                      +{p.adds.toLocaleString("en-US")}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {transactions.length > 0 && (
            <section>
              <h2 className="plate mb-3">Latest Moves</h2>
              <ul className="panel p-4 space-y-3 text-sm">
                {transactions.slice(0, 8).map((tx, i) => {
                  const t = tx.transaction;
                  const player = t?.player?.proPlayer;
                  if (!t?.team?.name || !player) return null;
                  return (
                    <li key={i}>
                      <span className="text-cream">{t.team.name}</span>{" "}
                      <span className="text-parch">
                        {TX_LABELS[t.type ?? ""] ?? "moved"}
                      </span>{" "}
                      <span className="text-cream">{player.nameFull}</span>
                      <span className="text-parch">
                        {" "}
                        · {player.position} {player.proTeamAbbreviation}
                        {timeAgo(tx.timeEpochMilli) && (
                          <> · {timeAgo(tx.timeEpochMilli)}</>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
