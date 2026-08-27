"use client";
// The gameday board. Server renders the initial scoreboard; this island
// re-polls every 60 seconds while the tab is open so Sunday afternoon feels
// live. The fetch-cache on the API route (30s) means polling costs
// Fleaflicker at most two calls a minute no matter how many people watch.
import { useEffect, useState } from "react";
import type { Scoreboard, LiveGame } from "@/lib/live";

function Side({
  name,
  pts,
  winning,
}: {
  name: string;
  pts: string | null;
  winning: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={winning ? "text-cream font-semibold" : "text-parch"}>
        {name}
      </span>
      <span
        className={`text-lg ${winning ? "text-amber font-bold" : "text-parch"}`}
      >
        {pts ?? "–"}
      </span>
    </div>
  );
}

function GameCard({ game }: { game: LiveGame }) {
  const a = game.awayScore?.score?.formatted ?? null;
  const h = game.homeScore?.score?.formatted ?? null;
  const av = game.awayScore?.score?.value ?? 0;
  const hv = game.homeScore?.score?.value ?? 0;
  const inPlay =
    (game.awayScore?.inPlay ?? 0) + (game.homeScore?.inPlay ?? 0) > 0;
  // Fleaflicker reports "0" for games nobody has played yet, so a score
  // existing does not mean the game started.
  const started = Boolean(game.isFinalScore) || inPlay || av + hv > 0;
  return (
    <div className="panel p-4 flex flex-col gap-2">
      <Side name={game.away.name} pts={started ? a : null} winning={started && av > hv} />
      <Side name={game.home.name} pts={started ? h : null} winning={started && hv > av} />
      <p className="text-xs text-parch pt-1 border-t border-edge flex justify-between">
        <span>{game.isDivisional ? "Division game" : "Cross-division"}</span>
        <span className={inPlay ? "text-win" : undefined}>
          {game.isFinalScore ? "Final" : inPlay ? "Live" : started ? "In progress" : "Not started"}
        </span>
      </p>
    </div>
  );
}

export default function LiveScoreboard({
  initial,
  week,
}: {
  initial: Scoreboard;
  week: number | null;
}) {
  const [board, setBoard] = useState<Scoreboard>(initial);

  useEffect(() => {
    // Poll the week being viewed, not whatever week is current, so a past
    // week's board does not snap forward a minute after it loads.
    const url = week === null ? "/api/scoreboard" : `/api/scoreboard?week=${week}`;
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) setBoard(await res.json());
      } catch {
        // keep showing the last board; next tick retries
      }
    };
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [week]);

  const games = board.games ?? [];
  if (games.length === 0) {
    return <p className="text-parch">No matchups on the board yet.</p>;
  }
  return (
    <div>
      {week !== null && (
        <p className="plate mb-3">Week {week}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    </div>
  );
}
