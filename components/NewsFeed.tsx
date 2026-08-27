"use client";
// The news rail with the "whose team are you" filter. Items arrive fully
// server-rendered props (already cross-referenced against every roster), so
// filtering here is pure array work: no fetch, no spinner. The chosen
// franchise persists in localStorage so the bar remembers your stool.
// Storage access is wrapped: private windows and blocked site data must not
// break the feed, they just forget the choice.
import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news";

const STORAGE_KEY = "beerleague.myTeam";

export default function NewsFeed({
  items,
  teams,
}: {
  items: NewsItem[];
  teams: { id: number; name: string }[];
}) {
  const [teamId, setTeamId] = useState<number | 0>(0);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      if (saved && teams.some((t) => t.id === saved)) setTeamId(saved);
    } catch {}
  }, [teams]);

  const pick = (id: number) => {
    setTeamId(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, String(id));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const shown =
    teamId === 0
      ? items
      : items.filter((i) => i.matches.some((m) => m.teamId === teamId));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label htmlFor="team-pick" className="text-sm text-parch">
          Pour the news for
        </label>
        <select
          id="team-pick"
          value={teamId}
          onChange={(e) => pick(Number(e.target.value))}
          className="bg-panel border border-edge rounded px-3 py-2 text-cream text-sm"
        >
          <option value={0}>The whole bar</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="text-parch">
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
                  className="text-cream font-semibold hover:text-amber transition-colors"
                >
                  {item.headline}
                </a>
                <p className="text-sm text-parch mt-1 line-clamp-3">
                  {item.description}
                </p>
                {why && (
                  <p className="text-xs text-amber mt-2">On your card: {why}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
