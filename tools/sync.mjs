#!/usr/bin/env node
// Archive sync: pulls the Beer League's full history from the Fleaflicker API
// into data/ as static JSON. The league lives on Fleaflicker (league 37401);
// this site is a read layer, so completed seasons are fetched once and
// committed. Re-run after each season, or with --season YYYY to refresh one.
//
// Why static files and not a database: the archive never changes once a season
// ends, the whole thing is a few MB, and committing it means the site builds
// with zero runtime dependencies on Fleaflicker for anything historical.
// Only the current season is fetched live by the app.
//
// Politeness: Fleaflicker publishes no rate limit, but it has one. The first
// run of this script at concurrency 4 / 150ms delay got the IP 403-blocked
// after ~370 requests (the block presented as nginx "403 Forbidden" on every
// endpoint and lifted on its own). So: one request at a time, 700ms apart,
// and a 403 or 429 is a signal to stop and wait minutes, not a missing
// resource. Slow is fine; the archive only has to download once.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const LEAGUE = 37401;
const FIRST_SEASON = 2007; // 2006 returns an echo of current teams with 0-0 records: pre-history, not data
const API = "https://www.fleaflicker.com/api";
const OUT = path.join(import.meta.dirname, "..", "data");
const CONCURRENCY = 1;
const DELAY_MS = 700;

const args = process.argv.slice(2);
const onlySeason = args.includes("--season")
  ? Number(args[args.indexOf("--season") + 1])
  : null;
const currentSeason = 2026; // bump each year; also the season the app fetches live

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(endpoint, params) {
  const qs = new URLSearchParams({ sport: "NFL", league_id: LEAGUE, ...params });
  const url = `${API}/${endpoint}?${qs}`;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 403 || res.status === 429) {
        // Rate limited. Waiting minutes beats restarting tomorrow.
        const wait = Math.min(60_000 * attempt, 300_000);
        console.log(`  rate limited (${res.status}), waiting ${wait / 1000}s`);
        await sleep(wait);
        throw new Error(`HTTP ${res.status}`);
      }
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return null; // other 4xx: the resource genuinely is not there
      return await res.json();
    } catch (e) {
      if (attempt === 8) throw new Error(`${url} failed after 8 tries: ${e.message}`);
      await sleep(2000 * attempt);
    }
  }
}

// Small worker pool. Order of results matches order of jobs.
async function pool(jobs, worker) {
  const results = new Array(jobs.length);
  let next = 0;
  async function run() {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await worker(jobs[i], i);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, run));
  return results;
}

async function save(rel, data) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data));
}

async function syncSeason(season) {
  const done = season < currentSeason;
  const marker = path.join(OUT, "seasons", String(season), ".complete");
  if (done && existsSync(marker) && !onlySeason) {
    console.log(`${season}: already archived, skipping`);
    return;
  }
  console.log(`${season}: standings + scoreboards`);

  const standings = await api("FetchLeagueStandings", { season });
  if (!standings?.divisions) {
    console.log(`${season}: no standings, skipping season`);
    return;
  }
  await save(`seasons/${season}/standings.json`, standings);

  // Week 1 tells us the eligible periods for the season; fetch the rest from it.
  const wk1 = await api("FetchLeagueScoreboard", { season, scoring_period: 1 });
  const periods = (wk1?.eligibleSchedulePeriods ?? []).map((p) => p.value ?? p.ordinal ?? p);
  const weeks = periods.length ? periods : Array.from({ length: 16 }, (_, i) => i + 1);
  const boards = await pool(weeks, async (week) => {
    if (week === 1) return wk1;
    return api("FetchLeagueScoreboard", { season, scoring_period: week });
  });

  const games = [];
  for (let i = 0; i < weeks.length; i++) {
    const board = boards[i];
    if (!board?.games?.length) continue;
    await save(`seasons/${season}/week-${weeks[i]}.json`, board);
    for (const g of board.games) games.push({ week: weeks[i], id: g.id });
  }

  // Box scores: player-level lineups for every game ever played. The heavy part.
  console.log(`${season}: ${games.length} box scores`);
  let saved = 0;
  await pool(games, async ({ week, id }) => {
    const rel = `seasons/${season}/box/${id}.json`;
    if (existsSync(path.join(OUT, rel))) {
      saved++;
      return;
    }
    const box = await api("FetchLeagueBoxscore", { fantasy_game_id: id });
    if (box) {
      await save(rel, { week, ...box });
      saved++;
    }
  });

  const draft = await api("FetchLeagueDraftBoard", { season });
  if (draft?.rows?.length || draft?.orderedSelections?.length) {
    await save(`seasons/${season}/draft.json`, draft);
  }

  // The marker means "every game's box score is on disk", not "the loop ran".
  // The first run wrote a marker for a season that was 28/90 downloaded.
  if (done && saved === games.length && games.length > 0) {
    await writeFile(marker, new Date().toISOString());
  }
  console.log(`${season}: done`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const seasons = onlySeason
    ? [onlySeason]
    : Array.from({ length: currentSeason - FIRST_SEASON + 1 }, (_, i) => FIRST_SEASON + i);
  for (const season of seasons) await syncSeason(season);

  // League-wide, current-state stuff (not per season)
  const rules = await api("FetchLeagueRules", {});
  if (rules) await save("rules.json", rules);
  console.log("archive sync complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
