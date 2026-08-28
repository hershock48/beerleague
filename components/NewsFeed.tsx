"use client";
// The news rail with the "whose team are you" filter. Items arrive fully
// server-rendered props (already cross-referenced against every roster), so
// filtering here is pure array work: no fetch, no spinner. The choice lives
// in lib/myTeam.ts and personalizes the whole site, not just this feed.
import type { NewsItem } from "@/lib/news";
import { useMyTeam, writeMyTeam } from "@/lib/myTeam";

export default function NewsFeed({
  items,
  teams,
}: {
  items: NewsItem[];
  teams: { id: number; name: string }[];
}) {
  const stored = useMyTeam();
  const teamId = teams.some((t) => t.id === stored) ? stored : 0;
  const pick = (id: number) => writeMyTeam(id);

  const shown =
    teamId === 0
      ? items
      : items.filter((i) => i.matches.some((m) => m.teamId === teamId));

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="team-pick" className="text-sm text-steel">
            Pour the news for
          </label>
          <select
            id="team-pick"
            value={teamId}
            onChange={(e) => pick(Number(e.target.value))}
            className="bg-panel border border-edge rounded px-3 py-2 text-ink text-sm"
          >
            <option value={0}>The whole bar</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {teamId !== 0 && (
          <p className="text-xs text-steel mt-2">
            Your matchup lights up on the board above, too.
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-steel">
          Quiet night. Nothing in the wire about this roster right now; switch
          to the whole bar for the full feed.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.slice(0, 12).map((item) => {
            const why =
              teamId !== 0
                ? item.matches.find((m) => m.teamId === teamId)?.via
                : null;
            return (
              <li key={item.url} className="panel p-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink font-semibold hover:text-volt transition-colors"
                >
                  {item.headline}
                </a>
                <p className="text-sm text-steel mt-1 line-clamp-3">
                  {item.description}
                </p>
                {why && (
                  <p className="text-xs text-volt mt-2 marker">On your card: {why}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
