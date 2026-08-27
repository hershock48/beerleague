import type { Metadata } from "next";
import Link from "next/link";
import LiveScoreboard from "@/components/LiveScoreboard";
import { getScoreboard } from "@/lib/live";
import { CURRENT_SEASON } from "@/lib/league";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scores",
  description: `Live Beer League scoreboards for every week of the ${CURRENT_SEASON} season.`,
};

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const requested = weekParam ? Number(weekParam) : undefined;
  const board = await getScoreboard(requested);

  if (!board) {
    return (
      <p className="text-parch">
        Fleaflicker is not answering right now; scores will be back when it is.
      </p>
    );
  }

  const week = board.schedulePeriod?.value ?? requested ?? 1;
  const weeks = (board.eligibleSchedulePeriods ?? [])
    .map((p) => p.value)
    .filter((v): v is number => typeof v === "number");

  return (
    <div>
      <h1 className="font-display text-3xl text-cream mb-6">
        Scores · {CURRENT_SEASON}
      </h1>
      {weeks.length > 0 && (
        <nav aria-label="Week" className="mb-6">
          <ul className="flex flex-wrap gap-1 text-sm">
            {weeks.map((w) => (
              <li key={w}>
                <Link
                  href={w === week ? "/scores" : `/scores?week=${w}`}
                  aria-current={w === week ? "page" : undefined}
                  className={`block px-3 py-2 rounded border ${
                    w === week
                      ? "border-amber text-amber"
                      : "border-edge text-parch hover:text-amber"
                  }`}
                >
                  {w}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <LiveScoreboard initial={board} week={week} />
      <p className="text-sm text-parch mt-8">
        Looking for past seasons? Every scoreboard back to 2007 lives in{" "}
        <Link href="/seasons" className="text-amber underline underline-offset-4 hover:no-underline">
          the archive
        </Link>
        .
      </p>
    </div>
  );
}
