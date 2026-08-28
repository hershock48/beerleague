// Assembles the inputs for lib/recap.ts from the two data planes.
// Archived seasons read the disk at build time (every archived recap is
// prerendered); the current season assembles from the live API at request
// time, because the archive is not in the serverless bundle.
import "server-only";
import { getSeasonGames, getArchivedBox, getSeason } from "./archive";
import { getScoreboard, getLiveBoxRaw } from "./live";
import { normalizeBox, type BoxScore } from "./box";
import { buildRecap, type Recap, type RecapGame } from "./recap";
import { CURRENT_SEASON } from "./league";

export async function getArchivedRecapWeeks(
  year: number,
): Promise<{ week: number; isPlayoff: boolean }[]> {
  const games = await getSeasonGames(year);
  const weeks = new Map<number, boolean>();
  for (const g of games) weeks.set(g.week, g.isPlayoff);
  return [...weeks.entries()]
    .map(([week, isPlayoff]) => ({ week, isPlayoff }))
    .sort((a, b) => a.week - b.week);
}

export async function getArchivedRecap(
  year: number,
  week: number,
): Promise<Recap | null> {
  const all = await getSeasonGames(year);
  const weekGames = all.filter((g) => g.week === week);
  if (weekGames.length === 0) return null;

  const boxes: BoxScore[] = [];
  for (const g of weekGames) {
    const raw = await getArchivedBox(year, g.id);
    const box = raw ? normalizeBox(raw) : null;
    if (box) boxes.push(box);
  }

  const recordsThrough = new Map<number, { name: string; w: number; l: number; t: number }>();
  for (const g of all.filter((x) => x.week <= week)) {
    for (const [side, my, their] of [
      [g.away, g.away.pts, g.home.pts] as const,
      [g.home, g.home.pts, g.away.pts] as const,
    ]) {
      const r = recordsThrough.get(side.id) ?? { name: side.name, w: 0, l: 0, t: 0 };
      r.name = side.name;
      if (my > their) r.w++;
      else if (my < their) r.l++;
      else r.t++;
      recordsThrough.set(side.id, r);
    }
  }

  const maxWeek = Math.max(...all.map((g) => g.week));
  const games: RecapGame[] = weekGames.map((g) => ({
    id: g.id,
    away: { id: g.away.id, name: g.away.name, pts: g.away.pts },
    home: { id: g.home.id, name: g.home.name, pts: g.home.pts },
  }));

  const isChampionshipWeek = week === maxWeek && weekGames.some((g) => g.isPlayoff);
  let champion: { name: string; runnerUp: string | null } | undefined;
  if (isChampionshipWeek) {
    const season = await getSeason(year);
    if (season?.champion) {
      champion = {
        name: season.champion.name,
        runnerUp: season.runnerUp?.name ?? null,
      };
    }
  }

  return buildRecap({
    year,
    week,
    games,
    boxes,
    recordsThrough,
    nextWeekGames: all
      .filter((g) => g.week === week + 1)
      .map((g) => ({ id: g.id, away: g.away.name, home: g.home.name })),
    isChampionshipWeek,
    champion,
  });
}

/** Current-season recap from the live API. Returns "pending" until every
 *  game in the week is final, so the column never publishes early. */
export async function getLiveRecap(
  week: number,
): Promise<Recap | "pending" | null> {
  const board = await getScoreboard(week);
  const games = board?.games ?? [];
  if (games.length === 0) return null;
  const allFinal = games.every((g) => g.isFinalScore);
  if (!allFinal) return "pending";

  const boxes: BoxScore[] = [];
  for (const g of games) {
    const raw = await getLiveBoxRaw(String(g.id));
    const box = raw ? normalizeBox(raw) : null;
    if (box) boxes.push(box);
  }

  // Records through this week: replay every completed week's board.
  const recordsThrough = new Map<number, { name: string; w: number; l: number; t: number }>();
  for (let w = 1; w <= week; w++) {
    const b = w === week ? board : await getScoreboard(w);
    for (const g of b?.games ?? []) {
      if (!g.isFinalScore) continue;
      const as = g.awayScore?.score?.value ?? 0;
      const hs = g.homeScore?.score?.value ?? 0;
      for (const [side, my, their] of [
        [g.away, as, hs] as const,
        [g.home, hs, as] as const,
      ]) {
        const r = recordsThrough.get(side.id) ?? { name: side.name, w: 0, l: 0, t: 0 };
        r.name = side.name;
        if (my > their) r.w++;
        else if (my < their) r.l++;
        else r.t++;
        recordsThrough.set(side.id, r);
      }
    }
  }

  const next = await getScoreboard(week + 1);
  const maxWeek = Math.max(
    ...(board?.eligibleSchedulePeriods ?? [])
      .map((p) => p.value)
      .filter((v): v is number => typeof v === "number"),
    week,
  );
  return buildRecap({
    year: CURRENT_SEASON,
    week,
    games: games.map((g) => ({
      id: String(g.id),
      away: { id: g.away.id, name: g.away.name, pts: g.awayScore?.score?.value ?? 0 },
      home: { id: g.home.id, name: g.home.name, pts: g.homeScore?.score?.value ?? 0 },
    })),
    boxes,
    recordsThrough,
    nextWeekGames: (next?.games ?? []).map((g) => ({
      id: String(g.id),
      away: g.away.name,
      home: g.home.name,
    })),
    isChampionshipWeek: week === maxWeek,
  });
}
