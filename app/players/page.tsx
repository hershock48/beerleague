import type { Metadata } from "next";
import PlayerSearch from "@/components/PlayerSearch";
import { getPlayerIndex } from "@/lib/players";
import { FIRST_SEASON } from "@/lib/league";

export const metadata: Metadata = {
  title: "Players",
  description: `Every player who ever suited up in the Beer League since ${FIRST_SEASON}, ranked by career points scored as a starter.`,
};

export default async function PlayersPage() {
  const index = await getPlayerIndex();
  // Everyone with real production is searchable; the one-week wonders with a
  // couple of garbage-time points would triple the payload for nobody.
  const rows = index.filter((r) => r.pts >= 20);
  const scored = index.filter((r) => r.pts > 0).length;

  return (
    <div>
      <h1 className="font-display text-3xl text-cream mb-2 scrawl">
        The Roster Wall
      </h1>
      <p className="text-parch mb-8 max-w-2xl">
        {scored.toLocaleString("en-US")} players have scored a point in this
        league since {FIRST_SEASON}. Every one of them has a card on the wall.
      </p>
      <PlayerSearch rows={rows} />
    </div>
  );
}
