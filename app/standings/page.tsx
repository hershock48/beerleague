import type { Metadata } from "next";
import { getStandings } from "@/lib/live";
import { getDerived } from "@/lib/archive";
import { CURRENT_SEASON } from "@/lib/league";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Standings",
  description: `Beer League standings, season ${CURRENT_SEASON}: records, points, streaks and waiver order for both divisions.`,
};

export default async function StandingsPage() {
  const [standings, derived] = await Promise.all([getStandings(), getDerived()]);
  const franchiseSlug = new Map(
    Object.values(derived.franchises).map((f) => [f.id, f.slug]),
  );

  if (!standings?.divisions) {
    return (
      <p className="text-steel">
        Fleaflicker is not answering right now; standings will be back when it
        is.
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ice mb-6 scrawl">
        Standings · {CURRENT_SEASON}
      </h1>
      <div className="space-y-8">
        {standings.divisions.map((div) => (
          <section key={div.id}>
            <h2 className="plate mb-3">{div.name}</h2>
            <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={`${div.name} standings`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-steel border-b border-edge">
                    <th className="px-4 py-3 font-normal">Team</th>
                    <th className="px-4 py-3 font-normal">Record</th>
                    <th className="px-4 py-3 font-normal">Div</th>
                    <th className="px-4 py-3 font-normal text-right">PF</th>
                    <th className="px-4 py-3 font-normal text-right">PA</th>
                    <th className="px-4 py-3 font-normal">Streak</th>
                    <th className="px-4 py-3 font-normal text-right">Waiver</th>
                  </tr>
                </thead>
                <tbody>
                  {div.teams.map((t) => (
                    <tr key={t.id} className="border-b border-edge last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/franchises/${franchiseSlug.get(t.id) ?? ""}`}
                          className="text-ice hover:text-volt"
                        >
                          {t.name}
                        </Link>
                        {t.owners?.[0] && (
                          <span className="text-steel"> · {t.owners[0].displayName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ice">
                        {t.recordOverall.formatted}
                      </td>
                      <td className="px-4 py-3 text-steel">
                        {t.recordDivision?.formatted ?? "–"}
                      </td>
                      <td className="px-4 py-3 text-right text-ice">
                        {t.pointsFor?.formatted ?? "0"}
                      </td>
                      <td className="px-4 py-3 text-right text-steel">
                        {t.pointsAgainst?.formatted ?? "0"}
                      </td>
                      <td className="px-4 py-3 text-steel">
                        {t.streak?.formatted ?? "–"}
                      </td>
                      <td className="px-4 py-3 text-right text-steel">
                        {t.waiverPosition ?? "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
