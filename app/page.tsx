import { Suspense } from "react";
import Link from "next/link";
import LiveScoreboard from "@/components/LiveScoreboard";
import NewsFeed from "@/components/NewsFeed";
import PlayDiagram from "@/components/PlayDiagram";
import YourStool, { type StoolTeam } from "@/components/YourStool";
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
    return <p className="text-steel">The news wire is quiet.</p>;
  }
  return <NewsFeed items={news} teams={teams} />;
}

async function TrendingSection() {
  const trending = await getTrending();
  if (trending.length === 0) return null;
  return (
    <section>
      <h2 className="plate mb-3">Waiver Wire Buzz</h2>
      <p className="text-xs text-steel mb-2">
        Most-added players across all fantasy leagues, last 24 hours.
      </p>
      <ol className="panel p-4 space-y-2 text-sm">
        {trending.map((p) => (
          <li key={p.name} className="flex justify-between gap-2">
            <span className="text-ice">
              {p.name}{" "}
              <span className="text-steel">
                {p.position} · {p.nflTeam}
              </span>
            </span>
            <span className="text-steel">+{p.adds.toLocaleString("en-US")}</span>
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
              <span className="text-ice">{t.team.name}</span>{" "}
              <span className="text-steel">
                {TX_LABELS[t.type ?? ""] ?? "moved"}
              </span>{" "}
              <span className="text-ice">{player.nameFull}</span>
              <span className="text-steel">
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

  const gameOf = new Map<number, string>();
  for (const g of board?.games ?? []) {
    gameOf.set(g.away.id, String(g.id));
    gameOf.set(g.home.id, String(g.id));
  }
  const stoolTeams: StoolTeam[] = teams.map((t) => {
    const f = derived.franchises[t.id];
    return {
      id: t.id,
      name: t.name,
      slug: f?.slug ?? "",
      record: f ? `${f.career.w}-${f.career.l}${f.career.t > 0 ? `-${f.career.t}` : ""}` : "0-0",
      titles: f?.championships.length ?? 0,
      gameId: gameOf.get(t.id) ?? null,
    };
  });

  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-ice mb-1 scrawl">
              The Tap Room
            </h1>
            <p className="text-steel">
              Season {CURRENT_SEASON}.{" "}
              {lastChampSeason?.champion && (
                <>
                  Defending champion:{" "}
                  <span className="text-volt">{lastChampSeason.champion.name}</span>{" "}
                  ({lastChampSeason.year}).
                </>
              )}
            </p>
          </div>
          <PlayDiagram className="hidden md:block w-56 h-auto shrink-0 -mt-3" />
        </div>
        {stoolTeams.length > 0 && <YourStool teams={stoolTeams} />}
        {board ? (
          <LiveScoreboard initial={board} week={week} />
        ) : (
          <p className="text-steel">
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
                    <h3 className="text-sm text-ice font-semibold mb-2">
                      {div.name}
                    </h3>
                    <ol className="space-y-1 text-sm">
                      {div.teams.map((t) => (
                        <li key={t.id} className="flex justify-between gap-2">
                          <span className="text-steel">{t.name}</span>
                          <span className="text-ice">
                            {t.recordOverall.formatted}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-steel text-sm">Standings unavailable.</p>
            )}
            <Link
              href="/standings"
              className="inline-block mt-2 text-sm text-volt underline underline-offset-4 hover:no-underline"
            >
              Full standings
            </Link>
          </section>

          <section>
            <h2 className="plate mb-3">From the Record Book</h2>
            <ul className="panel p-4 space-y-3 text-sm">
              {derived.records.highWeeks[0] && (
                <li>
                  <span className="text-steel">Highest week ever:</span>{" "}
                  <span className="text-ice">
                    {derived.records.highWeeks[0].name},{" "}
                    {derived.records.highWeeks[0].pts.toFixed(2)}
                  </span>{" "}
                  <span className="text-steel">
                    ({derived.records.highWeeks[0].year})
                  </span>
                </li>
              )}
              {derived.records.nailBiters[0] && (
                <li>
                  <span className="text-steel">Closest game:</span>{" "}
                  <span className="text-ice">
                    {Math.abs(
                      derived.records.nailBiters[0].away.pts -
                        derived.records.nailBiters[0].home.pts,
                    ).toFixed(2)}{" "}
                    points
                  </span>{" "}
                  <span className="text-steel">
                    ({derived.records.nailBiters[0].year})
                  </span>
                </li>
              )}
              {derived.records.playerHighs[0] && (
                <li>
                  <span className="text-steel">Best game ever started:</span>{" "}
                  <span className="text-ice">
                    {derived.records.playerHighs[0].player},{" "}
                    {derived.records.playerHighs[0].pts.toFixed(2)}
                  </span>{" "}
                  <span className="text-steel">
                    ({derived.records.playerHighs[0].year})
                  </span>
                </li>
              )}
            </ul>
            <p className="mt-2 text-sm flex flex-wrap gap-x-4">
              <Link
                href="/records"
                className="text-volt underline underline-offset-4 hover:no-underline"
              >
                The whole record book
              </Link>
              <Link
                href="/shame"
                className="text-loss underline underline-offset-4 hover:no-underline"
              >
                The Wall of Shame
              </Link>
            </p>
          </section>

          <section>
            <h2 className="plate mb-3">Last Call</h2>
            <div className="panel p-4 text-sm">
              <p className="text-steel mb-2">
                The weekly column returns when week 1 goes final. Meanwhile,
                the back issues run deep:
              </p>
              {/* Week 16 is written literally: this page renders at request
                  time on Vercel where the archive is not on disk, so the
                  final week cannot be derived here. 2025 ended in week 16;
                  update alongside CURRENT_SEASON in the yearly ritual. */}
              <Link
                href={`/recaps/${lastChampSeason?.year ?? 2025}/16`}
                className="text-volt underline underline-offset-4 hover:no-underline"
              >
                Read the {lastChampSeason?.year} championship recap
              </Link>
            </div>
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
