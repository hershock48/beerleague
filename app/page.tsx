import { Suspense } from "react";
import Link from "next/link";
import LiveScoreboard from "@/components/LiveScoreboard";
import NewsFeed from "@/components/NewsFeed";
import PlayDiagram from "@/components/PlayDiagram";
import { getScoreboard, getStandings, getTransactions } from "@/lib/live";
import { getNews, getTrending } from "@/lib/news";
import { getDerived } from "@/lib/archive";
import { CURRENT_SEASON } from "@/lib/league";

// The tap room shows live scores and this-hour news; it renders per request
// (glaze.md: route caching and time do not mix). The fetch caches in lib/
// keep the upstream calls throttled regardless of traffic.
//
// Streaming: the board, standings and record book arrive with the first
// byte; news, waiver buzz and the transaction log stream in behind them
// under Suspense. The reason is Sleeper's ~10MB player database: it is
// cached for 24 hours, but on a cold cache it takes seconds, and the whole
// page used to wait on it. The slowest feed now costs only its own section.
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

async function NewsSection({ teams }: { teams: { id: number; name: string }[] }) {
  const news = await getNews();
  if (news.length === 0) {
    return <p className="text-parch">The news wire is quiet.</p>;
  }
  return <NewsFeed items={news} teams={teams} />;
}

async function TrendingSection() {
  const trending = await getTrending();
  if (trending.length === 0) return null;
  return (
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
            <span className="text-parch">+{p.adds.toLocaleString("en-US")}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

async function MovesSection() {
  const transactions = await getTransactions();
  if (transactions.length === 0) return null;
  return (
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
                {timeAgo(tx.timeEpochMilli) && <> · {timeAgo(tx.timeEpochMilli)}</>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function Home() {
  const [board, standings, derived] = await Promise.all([
    getScoreboard(),
    getStandings(),
    getDerived(),
  ]);

  const week = board?.schedulePeriod?.value ?? null;
  const teams =
    standings?.divisions?.flatMap((d) =>
      d.teams.map((t) => ({ id: t.id, name: t.name })),
    ) ?? [];
  const lastChampSeason = derived.seasons.find((s) => s.champion) ?? null;

  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-cream mb-1 scrawl">
              The Tap Room
            </h1>
            <p className="text-parch">
              Season {CURRENT_SEASON}.{" "}
              {lastChampSeason?.champion && (
                <>
                  Defending champion:{" "}
                  <span className="text-amber">{lastChampSeason.champion.name}</span>{" "}
                  ({lastChampSeason.year}).
                </>
              )}
            </p>
          </div>
          <PlayDiagram className="hidden md:block w-56 h-auto shrink-0 -mt-3" />
        </div>
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
          <Suspense
            fallback={
              <div aria-busy="true" className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="skeleton h-32" />
                ))}
              </div>
            }
          >
            <NewsSection teams={teams} />
          </Suspense>
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

          <section>
            <h2 className="plate mb-3">From the Record Book</h2>
            <ul className="panel p-4 space-y-3 text-sm">
              {derived.records.highWeeks[0] && (
                <li>
                  <span className="text-parch">Highest week ever:</span>{" "}
                  <span className="text-cream">
                    {derived.records.highWeeks[0].name},{" "}
                    {derived.records.highWeeks[0].pts.toFixed(2)}
                  </span>{" "}
                  <span className="text-parch">
                    ({derived.records.highWeeks[0].year})
                  </span>
                </li>
              )}
              {derived.records.nailBiters[0] && (
                <li>
                  <span className="text-parch">Closest game:</span>{" "}
                  <span className="text-cream">
                    {Math.abs(
                      derived.records.nailBiters[0].away.pts -
                        derived.records.nailBiters[0].home.pts,
                    ).toFixed(2)}{" "}
                    points
                  </span>{" "}
                  <span className="text-parch">
                    ({derived.records.nailBiters[0].year})
                  </span>
                </li>
              )}
              {derived.records.playerHighs[0] && (
                <li>
                  <span className="text-parch">Best game ever started:</span>{" "}
                  <span className="text-cream">
                    {derived.records.playerHighs[0].player},{" "}
                    {derived.records.playerHighs[0].pts.toFixed(2)}
                  </span>{" "}
                  <span className="text-parch">
                    ({derived.records.playerHighs[0].year})
                  </span>
                </li>
              )}
            </ul>
            <Link
              href="/records"
              className="inline-block mt-2 text-sm text-amber underline underline-offset-4 hover:no-underline"
            >
              The whole record book
            </Link>
          </section>

          <Suspense fallback={<div aria-busy="true" className="skeleton h-56" />}>
            <TrendingSection />
          </Suspense>

          <Suspense fallback={<div aria-busy="true" className="skeleton h-56" />}>
            <MovesSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
