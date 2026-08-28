import type { Metadata } from "next";
import Link from "next/link";
import { getDerived, type DerivedGame } from "@/lib/archive";

export const metadata: Metadata = {
  title: "Record Book",
  description:
    "The Beer League record book: biggest weeks, worst nights, blowouts, nail-biters, streaks, and the greatest single-game player performances ever started.",
};

export default async function RecordsPage() {
  const derived = await getDerived();
  const r = derived.records;
  const nameOf = new Map(
    Object.values(derived.franchises).map((f) => [f.id, f.currentName]),
  );
  const slugOf = new Map(
    Object.values(derived.franchises).map((f) => [f.id, f.slug]),
  );

  const TeamLink = ({ id, name }: { id: number; name: string }) => (
    <Link
      href={`/franchises/${slugOf.get(id) ?? ""}`}
      className="text-cream hover:text-amber"
    >
      {name}
    </Link>
  );

  const GameLine = ({ g }: { g: DerivedGame }) => {
    const margin = Math.abs(g.away.pts - g.home.pts);
    const [winner, loser] =
      g.away.pts > g.home.pts ? [g.away, g.home] : [g.home, g.away];
    return (
      <li className="flex flex-wrap justify-between gap-x-3 gap-y-1">
        <span>
          <TeamLink id={winner.id} name={winner.name} />{" "}
          <span className="text-parch">
            {winner.pts.toFixed(2)}–{loser.pts.toFixed(2)}
          </span>{" "}
          <TeamLink id={loser.id} name={loser.name} />
        </span>
        <span className="text-parch">
          by {margin.toFixed(2)} ·{" "}
          <Link href={`/seasons/${g.year}`} className="text-amber underline underline-offset-4 hover:no-underline">
            {g.year}
          </Link>{" "}
          wk {g.week}
        </span>
      </li>
    );
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-cream mb-2 scrawl">The Record Book</h1>
      <p className="text-parch mb-6 max-w-2xl">
        {derived.totals.games.toLocaleString("en-US")} games and{" "}
        {derived.totals.playerPerformances.toLocaleString("en-US")} player
        performances across {derived.totals.seasons} seasons, distilled to the
        nights worth arguing about.
      </p>

      <nav aria-label="Record book sections" className="mb-10">
        <ul className="flex flex-wrap gap-2 text-sm">
          {[
            ["#high-weeks", "Highest scores"],
            ["#low-weeks", "Worst nights"],
            ["#blowouts", "Blowouts"],
            ["#nail-biters", "Nail-biters"],
            ["#player-highs", "Player games"],
            ["#bench", "Left on the bench"],
            ["#season-pf", "Best seasons"],
            ["#streaks", "Streaks"],
          ].map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                className="block px-3 py-2 rounded border border-edge text-parch hover:text-amber hover:border-amber transition-colors"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <section id="high-weeks" className="scroll-mt-4">
          <h2 className="plate mb-3">Highest Team Scores, Ever</h2>
          <ol className="panel p-4 space-y-2 text-sm taped tilt-l mt-3">
            {r.highWeeks.map((w, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="text-parch">{i + 1}.</span>{" "}
                  <TeamLink id={w.id} name={w.name} />{" "}
                  <span className="text-parch">
                    vs {w.vs},{" "}
                    <Link href={`/seasons/${w.year}`} className="text-amber underline underline-offset-4 hover:no-underline">
                      {w.year}
                    </Link>{" "}
                    wk {w.week}
                  </span>
                </span>
                <span className="text-amber font-semibold">{w.pts.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="low-weeks" className="scroll-mt-4">
          <h2 className="plate mb-3">Worst Nights at the Bar</h2>
          <ol className="panel p-4 space-y-2 text-sm taped tilt-r mt-3">
            {r.lowWeeks.map((w, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="text-parch">{i + 1}.</span>{" "}
                  <TeamLink id={w.id} name={w.name} />{" "}
                  <span className="text-parch">
                    vs {w.vs},{" "}
                    <Link href={`/seasons/${w.year}`} className="text-amber underline underline-offset-4 hover:no-underline">
                      {w.year}
                    </Link>{" "}
                    wk {w.week}
                  </span>
                </span>
                <span className="text-loss font-semibold">{w.pts.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="blowouts" className="scroll-mt-4">
          <h2 className="plate mb-3">Biggest Blowouts</h2>
          <ol className="panel p-4 space-y-2 text-sm taped tilt-l mt-3">
            {r.blowouts.map((g, i) => (
              <GameLine key={i} g={g} />
            ))}
          </ol>
        </section>

        <section id="nail-biters" className="scroll-mt-4">
          <h2 className="plate mb-3">Nail-Biters</h2>
          <ol className="panel p-4 space-y-2 text-sm taped tilt-r mt-3">
            {r.nailBiters.map((g, i) => (
              <GameLine key={i} g={g} />
            ))}
          </ol>
        </section>

        <section id="player-highs" className="scroll-mt-4">
          <h2 className="plate mb-3">Best Player Games Ever Started</h2>
          <ol className="panel p-4 space-y-2 text-sm taped tilt-l mt-3">
            {r.playerHighs.slice(0, 15).map((p, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="text-parch">{i + 1}.</span>{" "}
                  <span className="text-cream">{p.player}</span>{" "}
                  <span className="text-parch">
                    {p.pos} · for {p.team},{" "}
                    <Link href={`/seasons/${p.year}`} className="text-amber underline underline-offset-4 hover:no-underline">
                      {p.year}
                    </Link>{" "}
                    wk {p.week}
                  </span>
                </span>
                <span className="text-amber font-semibold">{p.pts.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="bench" className="scroll-mt-4">
          <h2 className="plate mb-3">Left on the Bench</h2>
          <p className="text-xs text-parch mb-2">
            The biggest games ever scored by a player whose manager sat him.
          </p>
          <ol className="panel p-4 space-y-2 text-sm taped tilt-r mt-3">
            {r.benchTragedies.map((p, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="text-parch">{i + 1}.</span>{" "}
                  <span className="text-cream">{p.player}</span>{" "}
                  <span className="text-parch">
                    {p.pos} · benched by {p.team},{" "}
                    <Link href={`/seasons/${p.year}`} className="text-amber underline underline-offset-4 hover:no-underline">
                      {p.year}
                    </Link>{" "}
                    wk {p.week}
                  </span>
                </span>
                <span className="text-loss font-semibold">{p.pts.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="season-pf" className="scroll-mt-4">
          <h2 className="plate mb-3">Best Seasons by Points</h2>
          <ol className="panel p-4 space-y-2 text-sm taped tilt-l mt-3">
            {r.seasonPF.map((s, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="text-parch">{i + 1}.</span>{" "}
                  <TeamLink id={s.id} name={s.name} />{" "}
                  <span className="text-parch">
                    {s.record},{" "}
                    <Link href={`/seasons/${s.year}`} className="text-amber underline underline-offset-4 hover:no-underline">
                      {s.year}
                    </Link>
                  </span>
                </span>
                <span className="text-amber font-semibold">{s.pf}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="streaks" className="scroll-mt-4">
          <h2 className="plate mb-3">Longest Streaks</h2>
          <ol className="panel p-4 space-y-2 text-sm taped tilt-r mt-3">
            {r.streaks.map((s, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <TeamLink id={s.id} name={nameOf.get(s.id) ?? "Unknown"} />{" "}
                  <span className="text-parch">
                    {s.from.year} wk {s.from.week} to {s.to.year} wk {s.to.week}
                  </span>
                </span>
                <span
                  className={`font-semibold ${s.type === "W" ? "text-win" : "text-loss"}`}
                >
                  {s.len} {s.type === "W" ? "wins" : "losses"}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {Object.entries(r.playerHighsByPos).map(([pos, list]) =>
          list.length === 0 ? null : (
            <section key={pos}>
              <h2 className="plate mb-3">Best {pos} Games</h2>
              <ol className="panel p-4 space-y-2 text-sm taped tilt-l mt-3">
                {list.map((p, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      <span className="text-cream">{p.player}</span>{" "}
                      <span className="text-parch">
                        for {p.team},{" "}
                        <Link href={`/seasons/${p.year}`} className="text-amber underline underline-offset-4 hover:no-underline">
                          {p.year}
                        </Link>{" "}
                        wk {p.week}
                      </span>
                    </span>
                    <span className="text-amber font-semibold">
                      {p.pts.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
