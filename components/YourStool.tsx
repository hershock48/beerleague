"use client";
// The personal shelf behind the bar. Until you say whose team you are, it
// asks once, right at the top; after that it is your shortcut row: your
// franchise page, your all-time record, your titles, this week's matchup.
// Same shared store as the news filter (lib/myTeam.ts), so either control
// sets both. Both states render inside the same min-height panel so the
// hydration flip from "unclaimed" to "yours" cannot shove the board around.
import Link from "next/link";
import { CURRENT_SEASON } from "@/lib/league";
import { useMyTeam, writeMyTeam } from "@/lib/myTeam";

export interface StoolTeam {
  id: number;
  name: string;
  slug: string;
  record: string;
  titles: number;
  gameId: string | null;
}

export default function YourStool({ teams }: { teams: StoolTeam[] }) {
  const myTeam = useMyTeam();
  const mine = teams.find((t) => t.id === myTeam) ?? null;

  return (
    <div className="panel px-4 py-3 mb-6 min-h-14 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {mine ? (
        <>
          <span className="marker text-volt">Your stool:</span>
          <Link
            href={`/franchises/${mine.slug}`}
            className="text-ice font-semibold hover:text-volt"
          >
            {mine.name}
          </Link>
          <span className="text-steel">
            {mine.record} all time
            {mine.titles > 0 && (
              <span className="text-volt"> {"🏆".repeat(mine.titles)}</span>
            )}
          </span>
          {mine.gameId && (
            <Link
              href={`/seasons/${CURRENT_SEASON}/games/${mine.gameId}`}
              className="text-volt underline underline-offset-4 hover:no-underline"
            >
              This week&apos;s matchup
            </Link>
          )}
          <button
            type="button"
            onClick={() => writeMyTeam(0)}
            className="ml-auto text-steel hover:text-volt text-xs px-2 py-2"
          >
            not you?
          </button>
        </>
      ) : (
        <>
          <label htmlFor="stool-pick" className="marker text-volt">
            Claim your stool:
          </label>
          <select
            id="stool-pick"
            value={0}
            onChange={(e) => writeMyTeam(Number(e.target.value))}
            className="bg-panel border border-edge rounded px-3 py-2 text-ice"
          >
            <option value={0}>Whose team are you?</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="text-steel text-xs">
            Lights up your matchup and pours your news. Remembered on this
            device.
          </span>
        </>
      )}
    </div>
  );
}
