import type { Metadata } from "next";
import Link from "next/link";
import { getAnalytics } from "@/lib/analytics";
import { LineChart, DivergingBars, Bars, SERIES_COLORS } from "@/components/charts";
import { FIRST_SEASON } from "@/lib/league";

export const metadata: Metadata = {
  title: "The Ledger",
  description:
    "Two decades of Beer League analytics: scoring eras, the grudge grid, the luck ledger, clutch records, and every point ever left on a bench.",
};

function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-steel hover:text-volt px-1 py-2">
        View as table
      </summary>
      <div className="panel overflow-x-auto mt-1" tabIndex={0} role="region" aria-label={caption}>
        <table className="w-full text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-left text-steel border-b border-edge">
              {head.map((h) => (
                <th key={h} className="px-3 py-2 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-edge last:border-0">
                {r.map((c, j) => (
                  <td key={j} className={`px-3 py-1.5 ${j === 0 ? "text-ink" : "text-steel"}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default async function LedgerPage() {
  const a = await getAnalytics();

  const luckiest = a.luck[0];
  const unluckiest = a.luck[a.luck.length - 1];
  const clutchKing = a.clutch[0];
  const benchKing = a.benchWaste[0];
  const first = a.seasonScoring[0];
  const latest = a.seasonScoring.filter((s) => s.avg > 0).at(-1)!;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-2 scrawl">The Ledger</h1>
      <p className="text-steel mb-10 max-w-2xl">
        The bar math: {a.seasonScoring.length} seasons run through the numbers,
        for settling arguments and starting better ones.
      </p>

      <div className="space-y-14">
        <section className="min-w-0">
          <h2 className="plate mb-1">Scoring Through the Eras</h2>
          <p className="text-sm text-steel mb-4 max-w-2xl">
            Average points per team per week, {first.year} to {latest.year}. The
            league scored {first.avg} a week in the candy years and{" "}
            {latest.avg} now; same bar, faster beer.
          </p>
          <div className="panel p-4">
            <LineChart
              title="Average points per team-game by season"
              series={[
                {
                  name: "League avg",
                  color: "var(--color-volt)",
                  points: a.seasonScoring.map((s) => ({
                    x: s.year,
                    y: s.avg,
                    label: `${s.year}: ${s.avg} avg · top week ${s.top.team} ${s.top.pts}`,
                  })),
                },
              ]}
            />
          </div>
          <DataTable
            caption="Average points per team-game by season"
            head={["Year", "Avg", "Top week"]}
            rows={a.seasonScoring.map((s) => [s.year, s.avg, `${s.top.team} (${s.top.pts})`])}
          />
        </section>

        <section className="min-w-0">
          <h2 className="plate mb-1">The Grudge Grid</h2>
          <p className="text-sm text-steel mb-4 max-w-2xl">
            Every all-time head-to-head record among the current twelve, read
            across: the row&apos;s record against the column. Green rows own
            somebody; red rows owe somebody.
          </p>
          <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="All-time head-to-head grid">
            <table className="text-xs w-full">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left text-steel font-normal">vs</th>
                  {a.grid.map((c) => (
                    <th key={c.id} className="px-1 py-2 text-steel font-normal max-w-14 truncate" title={c.name}>
                      {c.name.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.grid.map((row) => (
                  <tr key={row.id}>
                    <th className="px-2 py-1.5 text-left font-normal whitespace-nowrap">
                      <Link href={`/franchises/${row.slug}`} className="text-ink hover:text-volt">
                        {row.name}
                      </Link>
                    </th>
                    {row.cells.map((cell, j) => {
                      if (cell === null) {
                        return <td key={j} className="text-center text-edge px-1 py-1.5">·</td>;
                      }
                      const games = cell.w + cell.l + cell.t;
                      const pct = games > 0 ? cell.w / games : 0.5;
                      const alpha = Math.min(Math.abs(pct - 0.5) * 2, 1) * 0.38;
                      const bg =
                        games === 0
                          ? undefined
                          : pct >= 0.5
                            ? `rgb(134 226 124 / ${alpha.toFixed(2)})`
                            : `rgb(255 133 120 / ${alpha.toFixed(2)})`;
                      return (
                        <td
                          key={j}
                          className="text-center text-ink px-1 py-1.5 whitespace-nowrap"
                          style={bg ? { backgroundColor: bg } : undefined}
                          title={`${row.name} vs ${a.grid[j].name}: ${cell.w}-${cell.l}${cell.t ? `-${cell.t}` : ""}`}
                        >
                          {games === 0 ? "–" : `${cell.w}-${cell.l}`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0">
          <h2 className="plate mb-1">The Luck Ledger</h2>
          <p className="text-sm text-steel mb-4 max-w-2xl">
            Actual wins against Pythagorean expected wins from points scored and
            allowed, all time. <span className="text-ink">{luckiest.name}</span>{" "}
            has banked {luckiest.delta} more wins than its points earned;{" "}
            <span className="text-ink">{unluckiest.name}</span> is owed{" "}
            {Math.abs(unluckiest.delta)}. The schedule keeps receipts.
          </p>
          <div className="panel p-4">
            <DivergingBars
              title="Wins above or below Pythagorean expectation, all time"
              rows={a.luck.map((l) => ({
                name: l.name,
                value: l.delta,
                note: `${l.actW} actual vs ${l.expW} expected`,
              }))}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
            <div className="panel p-4 taped tilt-l mt-3">
              <p className="marker text-volt mb-2">Luckiest seasons ever</p>
              <ol className="space-y-1">
                {a.luckiestSeasons.map((s) => (
                  <li key={`${s.id}-${s.year}`} className="flex justify-between gap-2">
                    <span className="text-steel">
                      {s.name}, <Link href={`/seasons/${s.year}`} className="text-volt underline underline-offset-4 hover:no-underline">{s.year}</Link> ({s.record})
                    </span>
                    <span className="text-win">+{s.delta}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="panel p-4 taped tilt-r mt-3">
              <p className="marker text-pink mb-2">Most robbed seasons ever</p>
              <ol className="space-y-1">
                {a.unluckiestSeasons.map((s) => (
                  <li key={`${s.id}-${s.year}`} className="flex justify-between gap-2">
                    <span className="text-steel">
                      {s.name}, <Link href={`/seasons/${s.year}`} className="text-volt underline underline-offset-4 hover:no-underline">{s.year}</Link> ({s.record})
                    </span>
                    <span className="text-loss">{s.delta}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <DataTable
            caption="Luck ledger data"
            head={["Franchise", "Actual W", "Expected W", "Delta"]}
            rows={a.luck.map((l) => [l.name, l.actW, l.expW, l.delta > 0 ? `+${l.delta}` : l.delta])}
          />
        </section>

        <section className="min-w-0">
          <h2 className="plate mb-1">Cold Blood</h2>
          <p className="text-sm text-steel mb-4 max-w-2xl">
            Records in games decided by fewer than five points.{" "}
            <span className="text-ink">{clutchKing.name}</span> wins the close
            ones at {clutchKing.pct}%.
          </p>
          <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Close-game records">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-steel border-b border-edge">
                  <th className="px-4 py-2 font-normal">Franchise</th>
                  <th className="px-4 py-2 font-normal">Close-game record</th>
                  <th className="px-4 py-2 font-normal text-right">Win %</th>
                </tr>
              </thead>
              <tbody>
                {a.clutch.map((c) => (
                  <tr key={c.id} className="border-b border-edge last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/franchises/${c.slug}`} className="text-ink hover:text-volt">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-steel">{c.w}-{c.l}</td>
                    <td className={`px-4 py-2 text-right ${(c.pct ?? 50) >= 50 ? "text-win" : "text-loss"}`}>
                      {c.pct === null ? "–" : `${c.pct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0">
          <h2 className="plate mb-1">Points Left on the Bench</h2>
          <p className="text-sm text-steel mb-4 max-w-2xl">
            Every point ever scored by a player while his manager sat him.{" "}
            <span className="text-ink">{benchKing.name}</span> has wasted{" "}
            {benchKing.pts.toLocaleString("en-US")} points this way. Pour one
            out.
          </p>
          <div className="panel p-4">
            <Bars
              title="Career bench points by franchise"
              rows={a.benchWaste.map((b) => ({ name: b.name, value: b.pts }))}
            />
          </div>
        </section>

        <section className="min-w-0">
          <h2 className="plate mb-1">What a Start Is Worth</h2>
          <p className="text-sm text-steel mb-4 max-w-2xl">
            Average points per start by position since {FIRST_SEASON}. The gap
            between starting a quarterback and starting anyone else is the
            oldest fact in the league.
          </p>
          <div className="panel p-4">
            <LineChart
              title="Average points per start by position by season"
              series={(["QB", "RB", "WR", "TE"] as const).map((pos) => ({
                name: pos,
                color: SERIES_COLORS[pos],
                points: a.posEras
                  .filter((e) => e[pos] !== null)
                  .map((e) => ({
                    x: e.year,
                    y: e[pos] as number,
                    label: `${pos} ${e.year}: ${e[pos]} per start`,
                  })),
              }))}
            />
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-steel mt-2" aria-label="Legend">
              {(["QB", "RB", "WR", "TE"] as const).map((pos) => (
                <li key={pos} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block w-3 h-0.5 rounded"
                    style={{ backgroundColor: SERIES_COLORS[pos] }}
                  />
                  {pos}
                </li>
              ))}
            </ul>
          </div>
          <DataTable
            caption="Average points per start by position by season"
            head={["Year", "QB", "RB", "WR", "TE"]}
            rows={a.posEras.map((e) => [e.year, e.QB ?? "–", e.RB ?? "–", e.WR ?? "–", e.TE ?? "–"])}
          />
        </section>
      </div>
    </div>
  );
}
