import type { Metadata } from "next";
import Link from "next/link";
import { getDerived } from "@/lib/archive";
import { FIRST_SEASON } from "@/lib/league";

export const metadata: Metadata = {
  title: "Wall of Shame",
  description:
    "The Beer League's basement: every last-place finish since 2007, the perpetual plate of losers, and the worst nights anyone ever had.",
};

function pct(w: number, l: number, t: number): number {
  const g = w + l + t;
  return g === 0 ? 0 : (w + t / 2) / g;
}

export default async function ShamePage() {
  const derived = await getDerived();

  // The Sacko line: worst regular-season record each season, points for as
  // the tiebreak, from the final standings. Last is last; the consolation
  // bracket does not launder it.
  const plate = derived.seasons
    .filter((s) => !s.isCurrent)
    .map((s) => {
      const teams = s.standings.flatMap((d) => d.teams);
      const worst = [...teams].sort((a, b) => {
        const [aw, al, at = 0] = a.record.split("-").map(Number);
        const [bw, bl, bt = 0] = b.record.split("-").map(Number);
        return (
          pct(aw, al, at) - pct(bw, bl, bt) ||
          Number(a.pf.replace(/,/g, "")) - Number(b.pf.replace(/,/g, ""))
        );
      })[0];
      return { year: s.year, team: worst };
    })
    .sort((a, b) => b.year - a.year);

  // Career shame: last places, worst win percentage, most points against.
  const sackoCount = new Map<number, number>();
  for (const p of plate) {
    sackoCount.set(p.team.id, (sackoCount.get(p.team.id) ?? 0) + 1);
  }
  const franchises = Object.values(derived.franchises);
  const nameOf = new Map(franchises.map((f) => [f.id, f.currentName]));
  const slugOf = new Map(franchises.map((f) => [f.id, f.slug]));
  const sackoLeaders = [...sackoCount.entries()]
    .map(([id, n]) => ({ id, n, name: nameOf.get(id) ?? "Unknown" }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  const worstCareers = franchises
    .filter((f) => f.career.w + f.career.l >= 30)
    .map((f) => ({
      id: f.id, name: f.currentName, slug: f.slug,
      w: f.career.w, l: f.career.l, t: f.career.t,
      pct: pct(f.career.w, f.career.l, f.career.t),
    }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  const lossStreaks = derived.records.streaks.filter((s) => s.type === "L").slice(0, 5);
  const lowWeeks = derived.records.lowWeeks.slice(0, 5);
  const benchTragedies = derived.records.benchTragedies.slice(0, 5);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-2 scrawl">
        The Wall of Shame
      </h1>
      <p className="text-steel mb-10 max-w-2xl">
        Champions get the banner page. This is the other wall: every basement
        finish since {FIRST_SEASON}, engraved where the whole bar can read it.
      </p>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="plate mb-3">The Perpetual Plate</h2>
          <p className="text-sm text-steel mb-3">
            Worst regular season in the league, every year. Lowest points
            breaks the tie. No appeals.
          </p>
          <div className="panel overflow-x-auto taped tilt-l mt-3" tabIndex={0} role="region" aria-label="Last place by season">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-steel border-b border-edge">
                  <th className="px-4 py-2 font-normal">Year</th>
                  <th className="px-4 py-2 font-normal">Engraved</th>
                  <th className="px-4 py-2 font-normal">Record</th>
                  <th className="px-4 py-2 font-normal text-right">PF</th>
                </tr>
              </thead>
              <tbody>
                {plate.map((p) => (
                  <tr key={p.year} className="border-b border-edge last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/seasons/${p.year}`} className="text-volt underline underline-offset-4 hover:no-underline">
                        {p.year}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/franchises/${slugOf.get(p.team.id) ?? ""}`}
                        className="text-ink hover:text-volt"
                      >
                        {p.team.name}
                      </Link>
                      {p.team.owner && (
                        <span className="text-steel"> · {p.team.owner}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-loss">{p.team.record}</td>
                    <td className="px-4 py-2 text-right text-steel">{p.team.pf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-10 min-w-0">
          <section>
            <h2 className="plate mb-3">Most Names on the Plate</h2>
            <ol className="panel p-4 space-y-2 text-sm">
              {sackoLeaders.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <Link
                    href={`/franchises/${slugOf.get(s.id) ?? ""}`}
                    className="text-ink hover:text-volt"
                  >
                    {s.name}
                  </Link>
                  <span className="marker text-loss">
                    {s.n} {s.n === 1 ? "engraving" : "engravings"}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="plate mb-3">Worst Careers</h2>
            <p className="text-xs text-steel mb-2">
              All-time win percentage, minimum thirty games.
            </p>
            <ol className="panel p-4 space-y-2 text-sm">
              {worstCareers.map((f) => (
                <li key={f.id} className="flex justify-between gap-3">
                  <Link href={`/franchises/${f.slug}`} className="text-ink hover:text-volt">
                    {f.name}
                  </Link>
                  <span className="text-steel">
                    {f.w}-{f.l}
                    {f.t > 0 && `-${f.t}`} ·{" "}
                    <span className="text-loss">
                      {f.pct.toFixed(3).replace(/^0/, "")}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="plate mb-3">Longest Walks Home</h2>
            <ol className="panel p-4 space-y-2 text-sm taped tilt-r mt-3">
              {lossStreaks.map((s, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-steel">
                    {nameOf.get(s.id) ?? "Unknown"}, {s.from.year} wk {s.from.week} to{" "}
                    {s.to.year} wk {s.to.week}
                  </span>
                  <span className="text-loss font-semibold">{s.len} straight</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2 mt-10">
        <section className="min-w-0">
          <h2 className="plate mb-3">Worst Nights Ever</h2>
          <ol className="panel p-4 space-y-2 text-sm">
            {lowWeeks.map((w, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-steel">
                  {w.name} vs {w.vs},{" "}
                  <Link href={`/seasons/${w.year}`} className="text-volt underline underline-offset-4 hover:no-underline">
                    {w.year}
                  </Link>{" "}
                  wk {w.week}
                </span>
                <span className="text-loss font-semibold">{w.pts.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="min-w-0">
          <h2 className="plate mb-3">Crimes Against Benches</h2>
          <ol className="panel p-4 space-y-2 text-sm">
            {benchTragedies.map((p, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-steel">
                  {p.team} sat {p.player},{" "}
                  <Link href={`/seasons/${p.year}`} className="text-volt underline underline-offset-4 hover:no-underline">
                    {p.year}
                  </Link>{" "}
                  wk {p.week}
                </span>
                <span className="text-loss font-semibold">{p.pts.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <p className="text-sm text-steel mt-10 max-w-2xl">
        Got a punishment tradition worth recording here, a trophy with a
        story, a wager somebody never paid off? Tell the commissioner; this
        wall has room.
      </p>
    </div>
  );
}
