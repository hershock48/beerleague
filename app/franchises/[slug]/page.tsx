import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDerived, getFranchiseBySlug } from "@/lib/archive";

export async function generateStaticParams() {
  const derived = await getDerived();
  return Object.values(derived.franchises).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFranchiseBySlug(slug);
  if (!f) return {};
  return {
    title: f.currentName,
    description: `${f.currentName} in the Beer League: ${f.career.w}-${f.career.l} all time over ${f.seasons.length} seasons.`,
  };
}

function pct(w: number, l: number, t: number): string {
  const g = w + l + t;
  if (g === 0) return ".000";
  return ((w + t / 2) / g).toFixed(3).replace(/^0/, "");
}

export default async function FranchisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [f, derived] = await Promise.all([getFranchiseBySlug(slug), getDerived()]);
  if (!f) notFound();

  const others = Object.values(derived.franchises).filter((o) => o.id !== f.id);
  const rivals = others
    .map((o) => {
      const [lo, hi] = [f.id, o.id].sort((a, b) => a - b);
      const pair = derived.h2h[`${lo}-${hi}`];
      if (!pair) return null;
      const mine = f.id === lo ? pair.a : pair.b;
      return { other: o, ...mine };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.w + r.l + r.t > 0)
    .sort((a, b) => b.w + b.l + b.t - (a.w + a.l + a.t));

  const bestWeeks = derived.records.highWeeks.filter((tw) => tw.id === f.id);
  const owners = Object.keys(f.owners);

  return (
    <div>
      <p className="text-sm mb-2">
        <Link href="/franchises" className="text-volt underline underline-offset-4 hover:no-underline">
          ← All franchises
        </Link>
      </p>
      <h1 className="font-display text-3xl text-ink mb-1">
        {f.currentName}
        {f.championships.length > 0 && (
          <span className="text-volt glow"> {"🏆".repeat(f.championships.length)}</span>
        )}
      </h1>
      <p className="text-steel mb-8">
        {owners.length > 0 && <>Run by {owners.join(", ")} · </>}
        In the league since {f.seasons[0].year}
        {!f.active && <> · last poured {f.lastSeason}</>}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="panel p-4">
          <p className="plate">All-time record</p>
          <p className="text-2xl text-ink mt-1">
            {f.career.w}-{f.career.l}
            {f.career.t > 0 && `-${f.career.t}`}
          </p>
          <p className="text-sm text-steel">{pct(f.career.w, f.career.l, f.career.t)}</p>
        </div>
        <div className="panel p-4">
          <p className="plate">Championships</p>
          <p className="text-2xl text-ink mt-1">{f.championships.length}</p>
          <p className={`text-sm marker ${f.championships.length > 0 ? "text-volt" : "text-steel"}`}>
            {f.championships.length > 0
              ? f.championships.map((y) => `'${String(y).slice(2)}`).join("  ")
              : "still thirsty"}
          </p>
        </div>
        <div className="panel p-4">
          <p className="plate">Playoff runs</p>
          <p className="text-2xl text-ink mt-1">{f.playoffApps}</p>
          <p className="text-sm text-steel">
            {f.runnerUps.length > 0 && <>runner-up {f.runnerUps.join(", ")}</>}
          </p>
        </div>
        <div className="panel p-4">
          <p className="plate">Points all time</p>
          <p className="text-2xl text-ink mt-1">
            {Math.round(f.career.pf).toLocaleString("en-US")}
          </p>
          <p className="text-sm text-steel">
            against {Math.round(f.career.pa).toLocaleString("en-US")}
          </p>
        </div>
      </div>

      {/* min-w-0 on grid children: a grid track's implicit min-width is its
          content, so a wide table inside overflow-x-auto still pushed the
          page to 419px at 390 until the children were allowed to shrink. */}
      <div className="grid gap-10 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="plate mb-3">Season by Season</h2>
          <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Season by season">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-steel border-b border-edge">
                  <th className="px-4 py-2 font-normal">Year</th>
                  <th className="px-4 py-2 font-normal">Name</th>
                  <th className="px-4 py-2 font-normal">Record</th>
                  <th className="px-4 py-2 font-normal text-right">PF</th>
                  <th className="px-4 py-2 font-normal">Finish</th>
                </tr>
              </thead>
              <tbody>
                {[...f.seasons].reverse().map((s) => (
                  <tr key={s.year} className="border-b border-edge last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/seasons/${s.year}`} className="text-volt underline underline-offset-4 hover:no-underline">
                        {s.year}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-ink">{s.name}</td>
                    <td className="px-4 py-2 text-ink">{s.record}</td>
                    <td className="px-4 py-2 text-right text-ink">{s.pf}</td>
                    <td className="px-4 py-2">
                      {s.finish === "champion" ? (
                        <span className="text-volt">Champion</span>
                      ) : s.finish === "runner-up" ? (
                        <span className="text-ink">Runner-up</span>
                      ) : s.finish === "playoffs" ? (
                        <span className="text-steel">Playoffs</span>
                      ) : (
                        <span className="text-steel">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-10 min-w-0">
          <section>
            <h2 className="plate mb-3">Head to Head, All Time</h2>
            <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Head to head">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-steel border-b border-edge">
                    <th className="px-4 py-2 font-normal">Against</th>
                    <th className="px-4 py-2 font-normal">Record</th>
                    <th className="px-4 py-2 font-normal text-right">PF</th>
                    <th className="px-4 py-2 font-normal text-right">PA</th>
                  </tr>
                </thead>
                <tbody>
                  {rivals.map((r) => (
                    <tr key={r.other.id} className="border-b border-edge last:border-0">
                      <td className="px-4 py-2">
                        <Link
                          href={`/franchises/${r.other.slug}`}
                          className="text-ink hover:text-volt"
                        >
                          {r.other.currentName}
                        </Link>
                      </td>
                      <td className={`px-4 py-2 ${r.w > r.l ? "text-win" : r.w < r.l ? "text-loss" : "text-steel"}`}>
                        {r.w}-{r.l}
                        {r.t > 0 && `-${r.t}`}
                      </td>
                      <td className="px-4 py-2 text-right text-ink">{Math.round(r.pf)}</td>
                      <td className="px-4 py-2 text-right text-steel">{Math.round(r.pa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {bestWeeks.length > 0 && (
            <section>
              <h2 className="plate mb-3">Nights to Remember</h2>
              <ul className="panel p-4 space-y-2 text-sm">
                {bestWeeks.slice(0, 5).map((w, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-steel">
                      <Link href={`/seasons/${w.year}`} className="text-volt underline underline-offset-4 hover:no-underline">
                        {w.year}
                      </Link>{" "}
                      week {w.week} vs {w.vs}
                    </span>
                    <span className="text-ink">{w.pts.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-steel mt-2">
                Weeks that made the league's all-time top list.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
