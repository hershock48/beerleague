"use client";
// Draft night's wall feed. Server renders the current board; this island
// re-polls every 30 seconds while the tab is open, so thrown on a TV it
// keeps itself current through the whole draft. Picks are MADE in
// Fleaflicker's draft room; this is the board everyone watches.
import { useEffect, useState } from "react";
import type { LiveDraftBoard } from "@/lib/live";
import { useMyTeam } from "@/lib/myTeam";

const POS_COLOR: Record<string, string> = {
  QB: "text-pink",
  RB: "text-volt",
  WR: "text-win",
  TE: "text-loss",
};

interface Pick {
  overall: number;
  round: number;
  team: string;
  teamId: number | null;
  player: string;
  pos: string;
  nfl: string;
}

function flatten(board: LiveDraftBoard): Pick[] {
  const picks: Pick[] = [];
  let overall = 0;
  for (const row of board.rows ?? []) {
    for (const cell of row.cells ?? []) {
      if (!cell.player?.proPlayer?.nameFull || !cell.team?.name) continue;
      overall++;
      picks.push({
        overall,
        round: row.round ?? 0,
        team: cell.team.name,
        teamId: cell.team.id ?? null,
        player: cell.player.proPlayer.nameFull,
        pos: cell.player.proPlayer.position ?? "",
        nfl: cell.player.proPlayer.proTeamAbbreviation ?? "",
      });
    }
  }
  return picks;
}

export default function DraftBoard({ initial }: { initial: LiveDraftBoard }) {
  const [board, setBoard] = useState<LiveDraftBoard>(initial);
  const myTeam = useMyTeam();

  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch("/api/draft");
        if (res.ok) setBoard(await res.json());
      } catch {
        // keep the last board; next tick retries
      }
    };
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  const picks = flatten(board);
  const rounds = [...new Set(picks.map((p) => p.round))].sort((a, b) => a - b);

  if (picks.length === 0) {
    return (
      <div className="panel p-6 max-w-xl">
        <p className="marker text-volt text-lg mb-2">The board is clean.</p>
        <p className="text-steel text-sm">
          No picks yet. When the draft starts on Fleaflicker, every selection
          lands here within half a minute; leave this page up on the big
          screen and it keeps itself current.
        </p>
      </div>
    );
  }

  const recent = [...picks].slice(-8).reverse();

  return (
    <div className="space-y-10">
      <section>
        <h2 className="plate mb-3">Fresh off the Board</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          {recent.map((p) => (
            <li
              key={p.overall}
              className={`panel p-3 rise ${
                myTeam !== 0 && p.teamId === myTeam ? "border-volt/70" : ""
              }`}
            >
              <p className="text-xs text-steel">
                Pick {p.overall} · round {p.round}
              </p>
              <p className="text-ink font-semibold">
                {p.player}{" "}
                <span className={`text-xs ${POS_COLOR[p.pos] ?? "text-steel"}`}>
                  {p.pos} {p.nfl}
                </span>
              </p>
              <p className="text-xs text-steel mt-0.5">{p.team}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="min-w-0">
        <h2 className="plate mb-3">The Full Board</h2>
        <div className="space-y-2">
          {rounds.map((round) => (
            <details key={round} className="panel" open={round >= rounds.length - 1}>
              <summary className="cursor-pointer px-4 py-3 text-ink text-sm font-semibold">
                Round {round}
              </summary>
              <ol className="px-4 pb-4 grid gap-x-8 gap-y-1 sm:grid-cols-2 text-sm">
                {picks
                  .filter((p) => p.round === round)
                  .map((p) => (
                    <li key={p.overall} className="flex justify-between gap-3">
                      <span className="text-ink truncate">
                        {p.player}{" "}
                        <span className={`text-xs ${POS_COLOR[p.pos] ?? "text-steel"}`}>
                          {p.pos}
                        </span>
                      </span>
                      <span
                        className={`truncate ${
                          myTeam !== 0 && p.teamId === myTeam
                            ? "text-volt"
                            : "text-steel"
                        }`}
                      >
                        {p.team}
                      </span>
                    </li>
                  ))}
              </ol>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
