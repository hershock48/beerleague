import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDerived, getSeasonGames, getArchivedBox } from "@/lib/archive";
import { getLiveBoxRaw, getScoreboard } from "@/lib/live";
import { getPlayerSlugMap } from "@/lib/players";
import { normalizeBox, type BoxScore, type BoxPlayer } from "@/lib/box";
import { CURRENT_SEASON } from "@/lib/league";

// Archived games (every completed season) are all prerendered at build time,
// where the 262MB box archive is on disk. A request for a game that was NOT
// prerendered is either a current-season game, which is fetched live from
// Fleaflicker (60s cache, so it works as an in-game view on Sundays), or an
// invalid id, which 404s. The disk is deliberately never read at request
// time: it is not in the serverless bundle (see next.config.ts).
export async function generateStaticParams() {
  const derived = await getDerived();
  const params: { year: string; id: string }[] = [];
  for (const season of derived.seasons) {
    if (season.isCurrent) continue;
    const games = await getSeasonGames(season.year);
    for (const g of games) params.push({ year: String(season.year), id: g.id });
  }
  return params;
}

async function loadBox(year: number, id: string): Promise<BoxScore | null> {
  const raw =
    year >= CURRENT_SEASON ? await getLiveBoxRaw(id) : await getArchivedBox(year, id);
  if (!raw) return null;
  return normalizeBox(raw);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; id: string }>;
}): Promise<Metadata> {
  const { year, id } = await params;
  const box = await loadBox(Number(year), id);
  if (!box) return {};
  return {
    title: `${box.away.name} at ${box.home.name}, ${year} week ${box.week}`,
    description: `Full box score: ${box.away.name} ${box.away.pts?.toFixed(2) ?? ""} at ${box.home.name} ${box.home.pts?.toFixed(2) ?? ""}, Beer League ${year}, week ${box.week}.`,
  };
}

function PlayerCell({
  p,
  won,
  slug,
}: {
  p: BoxPlayer | null;
  won: boolean;
  slug: string | undefined;
}) {
  if (!p) return <td className="px-3 py-1.5 text-steel" colSpan={2}>–</td>;
  const tone = won ? "text-ink" : "text-steel";
  return (
    <>
      <td className={`px-3 py-1.5 ${tone}`}>
        {slug ? (
          <Link href={`/players/${slug}`} className={`${tone} hover:text-volt`}>
            {p.name}
          </Link>
        ) : (
          p.name
        )}{" "}
        <span className="text-steel text-xs">{p.pos}</span>
      </td>
      <td className={`px-3 py-1.5 text-right ${tone}`}>
        {p.pts === null ? "–" : p.pts.toFixed(2)}
      </td>
    </>
  );
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ year: string; id: string }>;
}) {
  const { year: yearParam, id } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();
  const [box, slugOfPlayer] = await Promise.all([
    loadBox(year, id),
    getPlayerSlugMap(),
  ]);
  if (!box) notFound();

  const awayWon = (box.away.pts ?? 0) > (box.home.pts ?? 0);
  const homeWon = (box.home.pts ?? 0) > (box.away.pts ?? 0);
  // "Live" needs points on the board, not just "not final": before kickoff
  // every current-season game is non-final, and this page once said "live,
  // refreshes each minute" about a game nobody had started.
  const started = (box.away.pts ?? 0) + (box.home.pts ?? 0) > 0;
  const live = year >= CURRENT_SEASON && !box.isFinal && started;
  const pregame = year >= CURRENT_SEASON && !box.isFinal && !started;

  // The other games that week, so a box score is never a dead end. Archived
  // years read the week files at build; the current season asks the live
  // scoreboard (cached), since the archive is not in the serverless bundle.
  let siblings: { id: string; away: string; home: string }[] = [];
  if (year >= CURRENT_SEASON) {
    const board = await getScoreboard(box.week);
    siblings = (board?.games ?? [])
      .filter((g) => String(g.id) !== id)
      .map((g) => ({ id: String(g.id), away: g.away.name, home: g.home.name }));
  } else {
    siblings = (await getSeasonGames(year))
      .filter((g) => g.week === box.week && g.id !== id)
      .map((g) => ({ id: g.id, away: g.away.name, home: g.home.name }));
  }

  return (
    <div>
      <p className="text-sm mb-4">
        <Link
          href={`/seasons/${year}`}
          className="text-volt underline underline-offset-4 hover:no-underline"
        >
          ← {year} season
        </Link>
      </p>

      <div className="panel p-5 mb-8">
        <p className="plate mb-2">
          Week {box.week} · {year}
          {live && <span className="text-win"> · live, refreshes each minute</span>}
          {pregame && <span className="text-steel"> · not kicked off yet</span>}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <p className={`font-display text-2xl ${awayWon ? "text-volt glow" : "text-ink"}`}>
            {box.away.name}{" "}
            <span className={`text-3xl ${awayWon ? "circled" : ""}`}>
              {box.away.pts?.toFixed(2) ?? "–"}
            </span>
          </p>
          <p className="text-steel">at</p>
          <p className={`font-display text-2xl ${homeWon ? "text-volt glow" : "text-ink"}`}>
            {box.home.name}{" "}
            <span className={`text-3xl ${homeWon ? "circled" : ""}`}>
              {box.home.pts?.toFixed(2) ?? "–"}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {box.groups.map((group) => (
          <section key={group.label} className="min-w-0">
            <h2 className="plate mb-3">{group.label}</h2>
            <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={`${group.label} box score`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-steel border-b border-edge">
                    <th className="px-3 py-2 font-normal">{box.away.name}</th>
                    <th className="px-3 py-2 font-normal text-right">Pts</th>
                    <th className="px-3 py-2 font-normal w-12 text-center">Slot</th>
                    <th className="px-3 py-2 font-normal">{box.home.name}</th>
                    <th className="px-3 py-2 font-normal text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {group.slots.map((slot, i) => (
                    <tr key={i} className="border-b border-edge last:border-0">
                      <PlayerCell
                        p={slot.away}
                        won={awayWon}
                        slug={slot.away?.id != null ? slugOfPlayer[slot.away.id] : undefined}
                      />
                      <td className="px-3 py-1.5 text-center text-xs text-volt">
                        {slot.label}
                      </td>
                      <PlayerCell
                        p={slot.home}
                        won={homeWon}
                        slug={slot.home?.id != null ? slugOfPlayer[slot.home.id] : undefined}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {siblings.length > 0 && (
        <nav aria-label={`Other week ${box.week} games`} className="mt-10">
          <h2 className="plate mb-3">More from Week {box.week}</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {siblings.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/seasons/${year}/games/${g.id}`}
                  className="block px-3 py-2 rounded border border-edge text-steel hover:text-volt hover:border-volt transition-colors"
                >
                  {g.away} at {g.home}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {year < CURRENT_SEASON && (
        <p className="text-xs text-steel mt-6">
          Player NFL teams are omitted on purpose: Fleaflicker reports each
          player&apos;s current team, not the team they played for in {year}.
        </p>
      )}
    </div>
  );
}
