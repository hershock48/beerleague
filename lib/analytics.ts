// Build-time reader for data/analytics.json (tools/derive-analytics.mjs).
// The Ledger page is SSG; nothing calls this at request time on Vercel,
// so the file is deliberately not traced into the serverless bundle.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface SeasonScoring {
  year: number;
  avg: number;
  top: { team: string; pts: number };
}

export interface PosEra {
  year: number;
  QB: number | null;
  RB: number | null;
  WR: number | null;
  TE: number | null;
}

export interface LuckRow {
  id: number;
  name: string;
  slug: string;
  expW: number;
  actW: number;
  delta: number;
  games: number;
}

export interface LuckSeason {
  id: number;
  name: string;
  year: number;
  delta: number;
  record: string;
}

export interface ClutchRow {
  id: number;
  name: string;
  slug: string;
  w: number;
  l: number;
  pct: number | null;
}

export interface BenchRow {
  id: number;
  name: string;
  slug: string;
  pts: number;
}

export interface GridRow {
  id: number;
  name: string;
  slug: string;
  cells: ({ w: number; l: number; t: number } | null)[];
}

export interface Analytics {
  seasonScoring: SeasonScoring[];
  posEras: PosEra[];
  luck: LuckRow[];
  luckiestSeasons: LuckSeason[];
  unluckiestSeasons: LuckSeason[];
  clutch: ClutchRow[];
  benchWaste: BenchRow[];
  grid: GridRow[];
}

let cache: Analytics | null = null;

export async function getAnalytics(): Promise<Analytics> {
  if (!cache) {
    cache = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "analytics.json"), "utf8"),
    ) as Analytics;
  }
  return cache;
}
