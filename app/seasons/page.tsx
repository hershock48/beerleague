import type { Metadata } from "next";
import Link from "next/link";
import { getDerived } from "@/lib/archive";
import { CANDY_ERA_NOTE, FIRST_SEASON } from "@/lib/league";

export const metadata: Metadata = {
  title: "Seasons",
  description: `Every Beer League season since ${FIRST_SEASON}: champions, runners-up and final standings, all the way back to the candy era.`,
};

export default async function SeasonsPage() {
  const derived = await getDerived();
  const done = derived.seasons.filter((s) => !s.isCurrent);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-2 scrawl">The Back Room</h1>
      <p className="text-steel mb-8 max-w-2xl">
        {done.length} completed seasons on the wall. {CANDY_ERA_NOTE}
      </p>
      <ol className="space-y-3">
        {derived.seasons.map((s) => (
          <li key={s.year}>
            <Link
              href={`/seasons/${s.year}`}
              className="panel flex flex-wrap items-baseline gap-x-6 gap-y-1 p-4 lift hover:border-volt"
            >
              <span className="font-display text-xl text-volt w-16">
                {s.year}
              </span>
              {s.isCurrent ? (
                <span className="text-steel">In progress</span>
              ) : s.champion ? (
                <>
                  <span className="text-ink">
                    🏆 {s.champion.name}
                    {s.champion.owner && (
                      <span className="text-steel"> · {s.champion.owner}</span>
                    )}
                  </span>
                  {s.runnerUp && (
                    <span className="text-steel text-sm">
                      over {s.runnerUp.name}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-steel">Season complete</span>
              )}
              <span className="text-steel text-sm ml-auto">
                {s.teamCount} teams
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
