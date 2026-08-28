"use client";
// The header's answer to "do we need logins": your stool, visible on every
// page like a signed-in identity. Same shared store as the pickers; claim
// it once per device and the whole site knows you. A chip, not an account:
// twelve friends do not need passwords to read a scoreboard, and real
// accounts only earn their keep when write features (pick'em, votes)
// arrive with a database behind them.
import Link from "next/link";
import { useMyTeam } from "@/lib/myTeam";

export default function StoolChip({
  teams,
}: {
  teams: { id: number; name: string; slug: string }[];
}) {
  const myTeam = useMyTeam();
  const mine = teams.find((t) => t.id === myTeam) ?? null;

  if (!mine) {
    return (
      <Link
        href="/"
        className="text-xs text-steel hover:text-volt px-2 py-2 whitespace-nowrap"
      >
        Claim your stool →
      </Link>
    );
  }
  return (
    <Link
      href={`/franchises/${mine.slug}`}
      className="marker text-sm text-pink hover:text-volt px-2 py-2 whitespace-nowrap"
      title="Your franchise"
    >
      🍺 {mine.name}
    </Link>
  );
}
