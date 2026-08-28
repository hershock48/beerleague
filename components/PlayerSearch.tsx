"use client";
// Roster search over every player who ever scored real points here. The
// whole dataset arrives as props (a few KB gzipped, static page), so typing
// filters instantly with no request. Empty query shows the career top 50.
import { useState } from "react";
import Link from "next/link";
import type { PlayerIndexRow } from "@/lib/players";

export default function PlayerSearch({ rows }: { rows: PlayerIndexRow[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = query
    ? rows.filter((r) => r.name.toLowerCase().includes(query)).slice(0, 40)
    : rows.slice(0, 50);

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="player-q" className="sr-only">
          Search players
        </label>
        <input
          id="player-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Who you looking for, coach?"
          className="w-full max-w-md bg-panel border border-edge rounded px-4 py-3 text-ink placeholder:text-steel"
        />
      </div>
      {shown.length === 0 ? (
        <p className="text-steel">
          Nobody by that name has ever scored a point in this league.
        </p>
      ) : (
        <div
          className="panel overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Player search results"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-steel border-b border-edge">
                <th className="px-4 py-3 font-normal">#</th>
                <th className="px-4 py-3 font-normal">Player</th>
                <th className="px-4 py-3 font-normal">Pos</th>
                <th className="px-4 py-3 font-normal text-right">Career pts</th>
                <th className="px-4 py-3 font-normal text-right">Starts</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.slug} className="border-b border-edge last:border-0">
                  <td className="px-4 py-2 text-steel">{r.rank}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/players/${r.slug}`}
                      className="text-ink hover:text-volt"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-steel">{r.pos}</td>
                  <td className="px-4 py-2 text-right text-volt">
                    {r.pts.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-steel">{r.games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!query && (
        <p className="text-xs text-steel mt-3">
          The all-time top 50 by points scored as a starter. Search finds
          anyone who ever suited up.
        </p>
      )}
    </div>
  );
}
