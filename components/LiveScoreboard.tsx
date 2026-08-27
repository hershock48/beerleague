"use client";
// The gameday board. Server renders the initial scoreboard; this island
// re-polls every 60 seconds while the tab is open so Sunday afternoon feels
// live. The fetch-cache on the API route (30s) means polling costs
// Fleaflicker at most two calls a minute no matter how many people watch.
// Every card links to the live box score page for that game.
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Scoreboard, LiveGame, LiveScore } from "@/lib/live";
import { CURRENT_SEASON } from "@/lib/league";
import { useMyTeam } from "@/lib/myTeam";

function Side({
  name,
  score,
  winning,
  started,
}: {
  name: string;
  score: LiveScore | undefined;
  winning: boolean;
  started: boolean;
}) {
  const pts = started ? (score?.score?.formatted ?? null) : null;
  const left = score?.yetToPlay ?? 0;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={winning ? "text-cream font-semibold" : "text-parch"}>
        {name}
        {started && left > 0 && (
          <span className="text-xs text-parch font-normal"> · {left} left</span>
        )}
      </span>
      <span className={`text-lg ${winning ? "text-amber font-bold" : "text-parch"}`}>
        {pts ?? "–"}
      </span>
    </div>
  );
}

function GameCard({ game, mine }: { game: LiveGame; mine: boolean }) {
  const av = game.awayScore?.score?.value ?? 0;
  const hv = game.homeScore?.score?.value ?? 0;
  const inPlay =
    (game.awayScore?.inPlay ?? 0) + (game.homeScore?.inPlay ?? 0) > 0;
  // Fleaflicker reports "0" for games nobody has played yet, so a score
  // existing does not mean the game started.
  const started = Boolean(game.isFinalScore) || inPlay || av + hv > 0;
  return (
    <Link
      href={`/seasons/${CURRENT_SEASON}/games/${game.id}`}
      className={`panel p-4 flex flex-col gap-2 transition-colors hover:border-amber ${
        mine ? "border-amber/70 shadow-[0_0_18px_rgb(232_163_61/0.15)]" : ""
      }`}
    >
      <Side
        name={game.away.name}
        score={game.awayScore}
        winning={started && av > hv}
        started={started}
      />
      <Side
        name={game.home.name}
        score={game.homeScore}
        winning={started && hv > av}
        started={started}
      />
      <p className="text-xs text-parch pt-1 border-t border-edge flex justify-between">
        <span>
          {mine ? (
            <span className="text-amber">Your matchup</span>
          ) : game.isDivisional ? (
            "Division game"
          ) : (
            "Cross-division"
          )}
        </span>
        <span className={inPlay ? "text-win" : undefined}>
          {game.isFinalScore
            ? "Final"
            : inPlay
              ? "Live"
              : started
                ? "In progress"
                : "Not started"}
        </span>
      </p>
    </Link>
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

  const myTeam = useMyTeam();
  const games = board.games ?? [];
  if (games.length === 0) {
    return <p className="text-parch">No matchups on the board yet.</p>;
  }
  // Highlight rather than reorder: a card that jumps position after
  // hydration reads as the page glitching.
  return (
    <div>
      {week !== null && <p className="plate mb-3">Week {week}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <GameCard
            key={g.id}
            game={g}
            mine={myTeam !== 0 && (g.away.id === myTeam || g.home.id === myTeam)}
          />
        ))}
      </div>
    </div>
  );
}
