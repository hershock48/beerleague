import type { Metadata } from "next";
import Link from "next/link";
import { getDerived } from "@/lib/archive";

export const metadata: Metadata = {
  title: "Franchises",
  description:
    "Every Beer League franchise ever: career records, titles, and the full run of names each one has played under.",
};

function pct(w: number, l: number, t: number): string {
  const g = w + l + t;
  if (g === 0) return ".000";
  return ((w + t / 2) / g).toFixed(3).replace(/^0/, "");
}

export default async function FranchisesPage() {
  const derived = await getDerived();
  const all = Object.values(derived.franchises).sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      b.championships.length - a.championships.length ||
      Number(pct(b.career.w, b.career.l, b.career.t)) -
        Number(pct(a.career.w, a.career.l, a.career.t)),
  );
  const active = all.filter((f) => f.active);
  const defunct = all.filter((f) => !f.active);

  const Card = ({ f }: { f: (typeof all)[number] }) => (
    <Link
      href={`/franchises/${f.slug}`}
      className="panel block p-4 hover:border-amber transition-colors"
    >
      <p className="text-cream font-semibold">
        {f.currentName}
        {f.championships.length > 0 && (
          <span className="text-amber"> {"🏆".repeat(f.championships.length)}</span>
        )}
      </p>
      <p className="text-sm text-parch mt-1">
        {f.career.w}-{f.career.l}
        {f.career.t > 0 && `-${f.career.t}`} all time ·{" "}
        {pct(f.career.w, f.career.l, f.career.t)} · {f.seasons.length}{" "}
        {f.seasons.length === 1 ? "season" : "seasons"}
      </p>
      {Object.keys(f.names).length > 1 && (
        <p className="text-xs text-parch mt-2">
          Also poured as: {Object.keys(f.names).filter((n) => n !== f.currentName).join(", ")}
        </p>
      )}
    </Link>
  );

  return (
    <div>
      <h1 className="font-display text-3xl text-cream mb-8 scrawl">Franchises</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((f) => (
          <Card key={f.id} f={f} />
        ))}
      </div>
      {defunct.length > 0 && (
        <>
          <h2 className="plate mt-12 mb-4">Left the Bar</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {defunct.map((f) => (
              <Card key={f.id} f={f} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
