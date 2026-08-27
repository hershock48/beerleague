// Server-only readers for the committed archive in data/.
// Everything historical renders from these; nothing here touches the network.
import "server-only";
import { readFile } from "node:fs/promises";
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

export async function getSeasonWeek(year: number, week: number): Promise<unknown> {
  return JSON.parse(
    await readFile(path.join(DATA, "seasons", String(year), `week-${week}.json`), "utf8"),
  );
}

export async function getDraft(year: number): Promise<unknown | null> {
  try {
    return JSON.parse(
      await readFile(path.join(DATA, "seasons", String(year), "draft.json"), "utf8"),
    );
  } catch {
    return null;
  }
}
