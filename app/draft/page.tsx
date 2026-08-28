import type { Metadata } from "next";
import DraftBoard from "@/components/DraftBoard";
import { getLiveDraftBoard, getStandings } from "@/lib/live";
import { CURRENT_SEASON, FLEAFLICKER_URL } from "@/lib/league";

// The draft companion. To be straight about it: drafting HAPPENS in
// Fleaflicker's draft room (the API is read-only), and this page never
// pretends otherwise. What it is: the wall board for draft night, updating
// itself as picks land, with the draft order and your team lit up.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft Room",
  description: `The Beer League ${CURRENT_SEASON} draft board, live: every pick as it lands, the draft order, and the full board round by round.`,
};

export default async function DraftPage() {
  const [board, standings] = await Promise.all([
    getLiveDraftBoard(),
    getStandings(),
  ]);

  const order = (
    standings?.divisions?.flatMap((d) => d.teams) ?? []
  )
    .filter((t) => t.draftPosition)
    .sort((a, b) => (a.draftPosition ?? 99) - (b.draftPosition ?? 99));

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-2 scrawl">
        The Draft Room
      </h1>
      <p className="text-steel mb-2 max-w-2xl">
        Picks are made in{" "}
        <a
          href={FLEAFLICKER_URL}
          className="text-volt underline underline-offset-4 hover:no-underline"
        >
          Fleaflicker&apos;s draft room
        </a>
        ; this is the board on the wall. It refreshes itself every half
        minute, so put it on the biggest screen in the house.
      </p>
      <p className="text-sm text-steel mb-8">
        Claim your stool on the Tap Room and your picks light up in volt.
      </p>

      {order.length > 0 && (
        <section className="mb-10">
          <h2 className="plate mb-3">The Order</h2>
          <ol className="flex flex-wrap gap-2 text-sm">
            {order.map((t) => (
              <li
                key={t.id}
                className="panel px-3 py-2 flex items-baseline gap-2"
              >
                <span className="marker text-volt">{t.draftPosition}</span>
                <span className="text-ink">{t.name}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {board ? (
        <DraftBoard initial={board} />
      ) : (
        <p className="text-steel">
          Fleaflicker is not answering right now; the board will be back when
          it is.
        </p>
      )}
    </div>
  );
}
