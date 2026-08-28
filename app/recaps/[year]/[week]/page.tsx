import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDerived } from "@/lib/archive";
import { getArchivedRecap, getArchivedRecapWeeks, getLiveRecap } from "@/lib/recapData";
import type { Recap } from "@/lib/recap";
import { CURRENT_SEASON } from "@/lib/league";

// Archived recaps are all prerendered from the on-disk archive. A request
// that was not prerendered is a current-season week, assembled at request
// time from the live API, or an invalid address, which 404s. The column
// only publishes once every game in the week is final.
export async function generateStaticParams() {
  const derived = await getDerived();
  const params: { year: string; week: string }[] = [];
  for (const season of derived.seasons) {
    if (season.isCurrent) continue;
    for (const w of await getArchivedRecapWeeks(season.year)) {
      params.push({ year: String(season.year), week: String(w.week) });
    }
  }
  return params;
}

async function loadRecap(
  year: number,
  week: number,
): Promise<Recap | "pending" | null> {
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 18) {
    return null;
  }
  if (year >= CURRENT_SEASON) return getLiveRecap(week);
  return getArchivedRecap(year, week);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; week: string }>;
}): Promise<Metadata> {
  const { year, week } = await params;
  const recap = await loadRecap(Number(year), Number(week));
  if (!recap || recap === "pending") {
    return { title: `Week ${week}, ${year} Recap` };
  }
  return { title: recap.title, description: recap.lede };
}

const TONE: Record<string, string> = {
  win: "text-win",
  loss: "text-loss",
  neutral: "text-volt",
};

export default async function RecapPage({
  params,
}: {
  params: Promise<{ year: string; week: string }>;
}) {
  const { year: yearParam, week: weekParam } = await params;
  const year = Number(yearParam);
  const week = Number(weekParam);
  const recap = await loadRecap(year, week);
  if (!recap) notFound();

  if (recap === "pending") {
    return (
      <div className="max-w-2xl">
        <p className="text-sm mb-4">
          <Link href="/recaps" className="text-volt underline underline-offset-4 hover:no-underline">
            ← All recaps
          </Link>
        </p>
        <h1 className="font-display text-3xl text-ink mb-3 scrawl">
          Week {week}, {year}
        </h1>
        <p className="text-steel">
          Still pouring. The column goes to print when every game in the week
          is final; check back after the Monday nighter.
        </p>
      </div>
    );
  }

  return (
    <article className="max-w-3xl">
      <p className="text-sm mb-4">
        <Link href="/recaps" className="text-volt underline underline-offset-4 hover:no-underline">
          ← All recaps
        </Link>
      </p>
      <p className="plate mb-1">The Recap</p>
      <h1 className="font-display text-3xl text-ink mb-4 scrawl">{recap.title}</h1>
      <p className="text-lg text-ink mb-8">{recap.lede}</p>

      <section className="mb-10">
        <h2 className="plate mb-3">The Hardware</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {recap.awards.map((a) => (
            <li key={a.label} className="panel p-4">
              <p className={`marker ${TONE[a.tone]} mb-1`}>{a.label}</p>
              <p className="text-ink font-semibold">{a.who}</p>
              <p className="text-sm text-steel mt-1">{a.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="plate mb-3">Around the Board</h2>
        <ul className="panel p-4 space-y-2.5 text-sm">
          {recap.gameNotes.map((n) => (
            <li key={n.gameId}>
              <Link
                href={`/seasons/${recap.year}/games/${n.gameId}`}
                className="text-steel hover:text-volt"
              >
                {n.line}{" "}
                <span className="text-volt text-xs">box score →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="plate mb-3">The Standings, to Keep Everyone Humble</h2>
        <ol className="panel p-4 grid gap-x-8 gap-y-1 sm:grid-cols-2 text-sm">
          {recap.standings.map((s, i) => (
            <li key={s.name} className="flex justify-between gap-3">
              <span className={i === 0 ? "text-ink" : "text-steel"}>
                {i + 1}. {s.name}
              </span>
              <span className={i === recap.standings.length - 1 ? "text-loss" : "text-ink"}>
                {s.record}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {recap.nextWeek && (
        <section>
          <h2 className="plate mb-3">On Deck</h2>
          <p className="text-sm text-steel mb-3">{recap.nextWeek.line}</p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {recap.nextWeek.games.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/seasons/${recap.year}/games/${g.id}`}
                  className="block px-3 py-2 rounded border border-edge text-steel hover:text-volt hover:border-volt transition-colors"
                >
                  {g.away} at {g.home}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
