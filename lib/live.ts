// Live fetchers for the current season, straight from the Fleaflicker API.
// Cache discipline: scoreboard 30s (it is the live surface), standings and
// rosters 5 minutes, news 15 minutes. All server-side; pages using these must
// not be statically generated with time baked in (glaze.md: route caching and
// time do not mix), so anything "this week" renders per request with these
// fetch-level caches doing the throttling.
import "server-only";
import { apiUrl, CURRENT_SEASON } from "./league";

async function fetchJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // The site must render with Fleaflicker down; callers show a quiet notice.
    return null;
  }
}

export interface LiveScore {
  score?: { value?: number; formatted?: string };
  yetToPlay?: number;
  inPlay?: number;
}

export interface LiveGame {
  id: string;
  away: { id: number; name: string; initials?: string };
  home: { id: number; name: string; initials?: string };
  awayScore?: LiveScore;
  homeScore?: LiveScore;
  isFinalScore?: boolean;
  isDivisional?: boolean;
}

export interface Scoreboard {
  games?: LiveGame[];
  schedulePeriod?: { value?: number; low?: { value?: number } };
  eligibleSchedulePeriods?: { value?: number }[];
}

export function getScoreboard(week?: number): Promise<Scoreboard | null> {
  const params: Record<string, number> = { season: CURRENT_SEASON };
  if (week) params.scoring_period = week;
  return fetchJson<Scoreboard>(apiUrl("FetchLeagueScoreboard", params), 30);
}

export interface StandingsTeam {
  id: number;
  name: string;
  recordOverall: { formatted: string; winPercentage?: { formatted: string } };
  recordDivision?: { rank?: number; formatted?: string };
  pointsFor?: { formatted: string };
  pointsAgainst?: { formatted: string };
  streak?: { formatted: string };
  waiverPosition?: number;
  draftPosition?: number;
  owners?: { displayName: string; lastSeenIso?: string }[];
}

export interface LiveStandings {
  divisions?: { id: number; name: string; teams: StandingsTeam[] }[];
  season?: number;
}

export function getStandings(): Promise<LiveStandings | null> {
  return fetchJson<LiveStandings>(
    apiUrl("FetchLeagueStandings", { season: CURRENT_SEASON }),
    300,
  );
}

export interface RosterPlayer {
  proPlayer: {
    id: number;
    nameFull: string;
    position: string;
    proTeamAbbreviation: string;
    proTeam?: { location?: string; name?: string };
  };
}

export interface TeamRoster {
  team: { id: number; name: string };
  players: RosterPlayer[];
}

interface RawRosters {
  rosters?: {
    team: { id: number; name: string };
    players?: { proPlayer: RosterPlayer["proPlayer"] }[];
  }[];
}

export async function getRosters(): Promise<TeamRoster[]> {
  const raw = await fetchJson<RawRosters>(
    apiUrl("FetchLeagueRosters", { season: CURRENT_SEASON }),
    300,
  );
  return (raw?.rosters ?? []).map((r) => ({
    team: { id: r.team.id, name: r.team.name },
    players: (r.players ?? []).filter((p) => p.proPlayer),
  }));
}

export interface Transaction {
  timeEpochMilli?: string;
  transaction?: {
    type?: string;
    player?: { proPlayer?: { nameFull?: string; position?: string; proTeamAbbreviation?: string } };
    team?: { id?: number; name?: string };
  };
}

export async function getTransactions(): Promise<Transaction[]> {
  const raw = await fetchJson<{ items?: Transaction[] }>(
    apiUrl("FetchLeagueTransactions", {}),
    300,
  );
  return raw?.items ?? [];
}
