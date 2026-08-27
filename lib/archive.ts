// Server-only readers for the committed archive in data/.
// Everything historical renders from these; nothing here touches the network.
import "server-only";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");

// derived.json is ~250KB and read by most pages; cache it per server process.
let derivedCache: Derived | null = null;

export interface FranchiseSeason {
  year: number;
  name: string;
  owner: string | null;
  record: string;
  pf: string;
  pa: string;
  division: string;
  divRank: number | null;
  /** Playoff seed, from Fleaflicker's recordPostseason.rank. Not the finish. */
  seed: number | null;
  postRecord: string | null;
  /** null means consolation bracket or missed the postseason entirely. */
  finish: "champion" | "runner-up" | "playoffs" | null;
}

export interface Franchise {
  id: number;
  slug: string;
  currentName: string;
  lastSeason: number;
  active: boolean;
  names: Record<string, number>;
  owners: Record<string, number>;
  career: { w: number; l: number; t: number; pf: number; pa: number };
  playoffApps: number;
  championships: number[];
  runnerUps: number[];
  seasons: FranchiseSeason[];
}

export interface GameSide {
  id: number;
  name: string;
  pts: number;
}

export interface DerivedGame {
  year: number;
  week: number;
  isPlayoff: boolean;
  away: GameSide;
  home: GameSide;
}

export interface SeasonSummary {
  year: number;
  isCurrent: boolean;
  teamCount: number;
  regularWeeks: number;
  champion: { id: number; name: string; owner: string | null; record: string } | null;
  runnerUp: { id: number; name: string } | null;
  bestRegular: { id: number; name: string; record: string; pf: string } | null;
  playoffGames: DerivedGame[];
  standings: {
    name: string;
    teams: {
      id: number;
      name: string;
      owner: string | null;
      record: string;
      pf: string;
      pa: string;
      seed: number | null;
      isChampion: boolean;
    }[];
  }[];
}

export interface TeamWeek {
  year: number;
  week: number;
  id: number;
  name: string;
  pts: number;
  vs: string;
  vsPts: number;
}

export interface PlayerGame {
  year: number;
  week: number;
  player: string;
  pos: string;
  pts: number;
  teamId: number;
  team: string;
}

export interface Derived {
  generatedAt: string;
  seasons: SeasonSummary[];
  franchises: Record<string, Franchise>;
  h2h: Record<string, { a: { w: number; l: number; t: number; pf: number; pa: number }; b: { w: number; l: number; t: number; pf: number; pa: number } }>;
  records: {
    highWeeks: TeamWeek[];
    lowWeeks: TeamWeek[];
    blowouts: DerivedGame[];
    nailBiters: DerivedGame[];
    seasonPF: (FranchiseSeason & { id: number; pfNum: number })[];
    playerHighs: PlayerGame[];
    playerHighsByPos: Record<string, PlayerGame[]>;
    benchTragedies: PlayerGame[];
    streaks: { id: number; type: "W" | "L" | "T"; len: number; from: { year: number; week: number }; to: { year: number; week: number } }[];
  };
  totals: { seasons: number; games: number; playerPerformances: number };
}

export async function getDerived(): Promise<Derived> {
  if (!derivedCache) {
    derivedCache = JSON.parse(
      await readFile(path.join(DATA, "derived.json"), "utf8"),
    ) as Derived;
  }
  return derivedCache;
}

export async function getFranchiseBySlug(slug: string): Promise<Franchise | null> {
  const d = await getDerived();
  return Object.values(d.franchises).find((f) => f.slug === slug) ?? null;
}

export async function getSeason(year: number): Promise<SeasonSummary | null> {
  const d = await getDerived();
  return d.seasons.find((s) => s.year === year) ?? null;
}

export interface SeasonGame {
  id: string;
  week: number;
  isPlayoff: boolean;
  away: GameSide;
  home: GameSide;
}

/**
 * Every completed game of a season, from the archived week files.
 * Build-time only (season and game pages are SSG); nothing calls this at
 * request time on Vercel, where data/seasons is not in the bundle.
 */
export async function getSeasonGames(year: number): Promise<SeasonGame[]> {
  const dir = path.join(DATA, "seasons", String(year));
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.startsWith("week-"));
  } catch {
    return [];
  }
  const season = await getSeason(year);
  const regularWeeks = season?.regularWeeks ?? 13;
  const games: SeasonGame[] = [];
  for (const file of files) {
    const week = Number(file.match(/\d+/)?.[0] ?? 0);
    const board = JSON.parse(await readFile(path.join(dir, file), "utf8")) as {
      games?: {
        id: string;
        away: { id: number; name: string };
        home: { id: number; name: string };
        awayScore?: { score?: { value?: number } };
        homeScore?: { score?: { value?: number } };
      }[];
    };
    for (const g of board.games ?? []) {
      const as = g.awayScore?.score?.value;
      const hs = g.homeScore?.score?.value;
      if (as === undefined || hs === undefined || (as === 0 && hs === 0)) continue;
      games.push({
        id: String(g.id),
        week,
        isPlayoff: week > regularWeeks,
        away: { id: g.away.id, name: g.away.name, pts: as },
        home: { id: g.home.id, name: g.home.name, pts: hs },
      });
    }
  }
  return games.sort((a, b) => a.week - b.week);
}

export async function getArchivedBox(
  year: number,
  gameId: string,
): Promise<unknown | null> {
  // gameId comes from the URL; keep it from escaping the box directory.
  if (!/^\d+$/.test(gameId)) return null;
  try {
    return JSON.parse(
      await readFile(
        path.join(DATA, "seasons", String(year), "box", `${gameId}.json`),
        "utf8",
      ),
    );
  } catch {
    return null;
  }
}

export interface DraftPick {
  round: number;
  team: string;
  teamId: number;
  player: string;
  pos: string;
}

export async function getDraftBoard(year: number): Promise<DraftPick[]> {
  let raw: {
    rows?: {
      round?: number;
      cells?: {
        team?: { id?: number; name?: string };
        player?: { proPlayer?: { nameFull?: string; position?: string } };
      }[];
    }[];
  };
  try {
    raw = JSON.parse(
      await readFile(path.join(DATA, "seasons", String(year), "draft.json"), "utf8"),
    );
  } catch {
    return [];
  }
  const picks: DraftPick[] = [];
  for (const row of raw.rows ?? []) {
    for (const cell of row.cells ?? []) {
      if (!cell.player?.proPlayer?.nameFull || !cell.team?.name) continue;
      picks.push({
        round: row.round ?? 0,
        team: cell.team.name,
        teamId: cell.team.id ?? 0,
        player: cell.player.proPlayer.nameFull,
        pos: cell.player.proPlayer.position ?? "",
      });
    }
  }
  return picks;
}
