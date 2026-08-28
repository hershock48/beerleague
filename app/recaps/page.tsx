import type { Metadata } from "next";
import Link from "next/link";
import { getDerived } from "@/lib/archive";
import { getArchivedRecapWeeks } from "@/lib/recapData";
import { CURRENT_SEASON, FIRST_SEASON } from "@/lib/league";

export const metadata: Metadata = {
  title: "Recaps",
  description: `The Beer League's weekly column, back to ${FIRST_SEASON}: every week of every season written up, awards and all.`,
};

export default async function RecapsPage() {
  const derived = await getDerived();
  const seasons = [];
  for (const s of derived.seasons) {
    if (s.isCurrent) continue;
    const weeks = await getArchivedRecapWeeks(s.year);
    if (weeks.length > 0) {
      seasons.push({ year: s.year, weeks, champion: s.champion?.name ?? null });
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-2 scrawl">The Recaps</h1>
      <p className="text-steel mb-4 max-w-2xl">
        The weekly column, written by the bar itself: hardware, box scores,
        and standings to keep everyone humble. Every week back to{" "}
        {FIRST_SEASON}.
      </p>
      <p className="text-sm text-steel mb-10">
        Season {CURRENT_SEASON} columns publish here as each week goes final.
      </p>

      <div className="space-y-8">
        {seasons.map((s) => (
          <section key={s.year}>
            <h2 className="plate mb-3">
              {s.year}
              {s.champion && (
                <span className="text-steel font-normal normal-case tracking-normal">
                  {" "}· 🏆 {s.champion}
                </span>
              )}
            </h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {s.weeks.map((w) => (
                <li key={w.week}>
                  <Link
                    href={`/recaps/${s.year}/${w.week}`}
                    className={`block px-3 py-2 rounded border transition-colors ${
                      w.isPlayoff
                        ? "border-volt/50 text-volt hover:border-volt"
                        : "border-edge text-steel hover:text-volt hover:border-volt"
                    }`}
                  >
                    {w.week}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
