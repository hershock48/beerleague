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
  const proj = score?.projected?.formatted;
  const left = score?.yetToPlay ?? 0;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={winning ? "text-ink font-semibold" : "text-steel"}>
        {name}
        {started && left > 0 && (
          <span className="text-xs text-steel font-normal"> · {left} left</span>
        )}
      </span>
      {pts !== null ? (
        <span className={`text-lg ${winning ? "text-volt font-bold" : "text-steel"}`}>
          {pts}
        </span>
      ) : proj ? (
        <span className="text-sm text-steel">proj {proj}</span>
      ) : (
        <span className="text-lg text-steel">–</span>
      )}
    </div>
  );
}

// Win probability from Fleaflicker's own projections (pregame they are the
// full totals, in-game they track score plus what is left). Difference of
// two projections, normal noise: sigma 13 per team, so 13*sqrt(2) on the
// margin, close to this league's observed weekly spread. A coin flip until
// projections exist; nothing shown once the game is final.
function winProb(away: number | undefined, home: number | undefined): number | null {
  if (away === undefined || home === undefined || (away === 0 && home === 0)) {
    return null;
  }
  const z = (away - home) / (13 * Math.SQRT2);
  // Abramowitz-Stegun approximation of the normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p =
    1 -
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z < 0) p = 1 - p;
  return p;
}

function GameCard({ game, mine, order }: { game: LiveGame; mine: boolean; order: number }) {
  const av = game.awayScore?.score?.value ?? 0;
  const hv = game.homeScore?.score?.value ?? 0;
  const inPlay =
    (game.awayScore?.inPlay ?? 0) + (game.homeScore?.inPlay ?? 0) > 0;
  // Fleaflicker reports "0" for games nobody has played yet, so a score
  // existing does not mean the game started.
  const started = Boolean(game.isFinalScore) || inPlay || av + hv > 0;
  const p = game.isFinalScore
    ? null
    : winProb(game.awayScore?.projected?.value, game.homeScore?.projected?.value);
  const favored = p === null ? null : p >= 0.5 ? game.away.name : game.home.name;
  // Capped at 99: a pre-draft roster can project 13 points and the math
  // says certainty, but this bar has seen too much to ever print 100%.
  const favoredPct =
    p === null ? null : Math.min(99, Math.round(Math.max(p, 1 - p) * 100));
  return (
    <Link
      href={`/seasons/${CURRENT_SEASON}/games/${game.id}`}
      className={`panel p-4 flex flex-col gap-2 lift rise rise-${Math.min(order + 1, 8)} hover:border-volt ${
        mine ? "border-volt/70 shadow-[0_2px_10px_rgb(76_112_0/0.2)]" : ""
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
      {p !== null && favored && (
        <div className="pt-0.5">
          {/* the win meter: away's share of the probability, volt on track */}
          <div
            className="h-1 rounded bg-edge overflow-hidden"
            role="img"
            aria-label={`${favored} ${favoredPct}% to win`}
          >
            <div
              className="h-full bg-volt rounded"
              style={{ width: `${Math.round(p * 100)}%` }}
            />
          </div>
          <p className="text-xs text-steel mt-1">
            {favored} <span className="text-volt">{favoredPct}%</span> to win
          </p>
        </div>
      )}
      <p className="text-xs text-steel pt-1 border-t border-edge flex justify-between">
        <span>
          {mine ? (
            <span className="text-volt marker">Your matchup</span>
          ) : game.isDivisional ? (
            "Division game"
          ) : (
            "Cross-division"
          )}
        </span>
        <span className={inPlay ? "text-win inline-flex items-center gap-1.5" : undefined}>
          {inPlay && <span className="pulse-dot" aria-hidden="true" />}
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
    return <p className="text-steel">No matchups on the board yet.</p>;
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
            order={games.indexOf(g)}
            mine={myTeam !== 0 && (g.away.id === myTeam || g.home.id === myTeam)}
          />
        ))}
      </div>
    </div>
  );
}
