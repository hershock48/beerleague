// Build-time readers for data/players.json (written by tools/derive-players.mjs).
// Every consumer is SSG, so this file is deliberately NOT in
// next.config.ts's outputFileTracingIncludes: nothing may call it at request
// time on Vercel, where the 1.8MB file is absent from the bundle.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface PlayerIndexRow {
  rank: number;
  slug: string;
  name: string;
  pos: string;
  pts: number;
  games: number;
}

export interface PlayerStint {
  year: number;
  teamId: number;
  team: string;
  startedGames: number;
  startedPts: number;
  benchGames: number;
}

export interface PlayerGameLine {
  year: number;
  week: number;
  pts: number;
  team: string;
  gameId: string;
  started: boolean;
}

export interface PlayerDetail {
  id: number;
  slug: string;
  name: string;
  pos: string;
  startedPts: number;
  startedGames: number;
  benchPts: number;
  benchGames: number;
  topGames: PlayerGameLine[];
  stints: PlayerStint[];
}

interface PlayersFile {
  index: PlayerIndexRow[];
  players: Record<string, PlayerDetail>;
}

let cache: PlayersFile | null = null;

async function load(): Promise<PlayersFile> {
  if (!cache) {
    cache = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "players.json"), "utf8"),
    ) as PlayersFile;
  }
  return cache;
}

export async function getPlayerIndex(): Promise<PlayerIndexRow[]> {
  return (await load()).index;
}

export async function getPlayer(slug: string): Promise<PlayerDetail | null> {
  return (await load()).players[slug] ?? null;
}

// The slim id -> slug map IS traced into the serverless bundle (see
// next.config.ts), so unlike everything above it is safe at request time.
// Live game pages use it to link players.
let slugCache: Record<string, string> | null = null;

export async function getPlayerSlugMap(): Promise<Record<string, string>> {
  if (!slugCache) {
    try {
      slugCache = JSON.parse(
        await readFile(
          path.join(process.cwd(), "data", "player-slugs.json"),
          "utf8",
        ),
      ) as Record<string, string>;
    } catch {
      // A live page without the map still renders, just without player links.
      slugCache = {};
    }
  }
  return slugCache;
}
