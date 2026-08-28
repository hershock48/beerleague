#!/usr/bin/env node
// Player career engine. Walks every box score in the archive and writes
// data/players.json: every player who ever wore a Beer League uniform, with
// career starter/bench splits, per-season stints, and their best games.
// Run after tools/sync.mjs, alongside tools/derive.mjs.
//
// players.json is read at BUILD TIME ONLY (all player pages are SSG), so it
// is deliberately not in next.config.ts's outputFileTracingIncludes and its
// size does not matter at runtime.
//
// Same data facts as derive.mjs: starters are the group labeled START, the
// unlabeled group is the bench, player points live at viewingActualPoints,
// and a player's proTeamAbbreviation is their CURRENT NFL team, useless for
// history. proPlayer.id is the stable identity; names collide (there have
// been multiple distinct Zach Millers in the NFL).

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DATA = path.join(import.meta.dirname, "..", "data");

async function main() {
  const players = new Map(); // proPlayer.id -> record
  const seasons = (await readdir(path.join(DATA, "seasons")))
    .filter((d) => /^\d{4}$/.test(d)).map(Number).sort();

  for (const year of seasons) {
    const boxDir = path.join(DATA, "seasons", String(year), "box");
    if (!existsSync(boxDir)) continue;
    for (const bf of await readdir(boxDir)) {
      const gameId = bf.replace(".json", "");
      const box = JSON.parse(await readFile(path.join(boxDir, bf), "utf8"));
      if (!box.game) continue;
      for (const group of box.lineups ?? []) {
        const isStart = group.group === "START";
        const isBench = !group.group && group.slots?.[0]?.position?.label === "BN";
        if (!isStart && !isBench) continue;
        for (const slot of group.slots ?? []) {
          for (const side of ["away", "home"]) {
            const raw = slot[side];
            if (!raw?.proPlayer) continue;
            const pts = raw.viewingActualPoints?.value ?? 0;
            const team = box.game[side];
            const p = players.get(raw.proPlayer.id) ?? {
              id: raw.proPlayer.id,
              name: raw.proPlayer.nameFull,
              pos: raw.proPlayer.position ?? "",
              startedPts: 0, startedGames: 0,
              benchPts: 0, benchGames: 0,
              stints: new Map(), // `${year}|${teamId}` -> stint
              games: [],
            };
            // Latest name/position wins (players change position labels)
            p.name = raw.proPlayer.nameFull;
            if (raw.proPlayer.position) p.pos = raw.proPlayer.position;
            if (isStart) { p.startedPts += pts; p.startedGames++; }
            else { p.benchPts += pts; p.benchGames++; }
            const key = `${year}|${team.id}`;
            const stint = p.stints.get(key) ?? {
              year, teamId: team.id, team: team.name,
              startedGames: 0, startedPts: 0, benchGames: 0,
            };
            stint.team = team.name;
            if (isStart) { stint.startedGames++; stint.startedPts += pts; }
            else stint.benchGames++;
            p.stints.set(key, stint);
            if (pts > 0) {
              p.games.push({ year, week: box.week, pts, team: team.name, gameId, started: isStart });
            }
            players.set(raw.proPlayer.id, p);
          }
        }
      }
    }
    console.log(`${year}: done (${players.size} players so far)`);
  }

  // Slugs: name-based, id suffix only on collision.
  const bySlug = new Map();
  const list = [...players.values()];
  for (const p of list) {
    let slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (bySlug.has(slug)) slug = `${slug}-${p.id}`;
    bySlug.set(slug, p);
    p.slug = slug;
  }

  const detail = {};
  for (const p of list) {
    p.games.sort((a, b) => b.pts - a.pts);
    const stints = [...p.stints.values()].sort(
      (a, b) => a.year - b.year || b.startedGames - a.startedGames,
    );
    detail[p.slug] = {
      id: p.id, slug: p.slug, name: p.name, pos: p.pos,
      startedPts: Math.round(p.startedPts * 100) / 100,
      startedGames: p.startedGames,
      benchPts: Math.round(p.benchPts * 100) / 100,
      benchGames: p.benchGames,
      topGames: p.games.slice(0, 10),
      stints,
    };
  }

  const index = list
    .sort((a, b) => b.startedPts - a.startedPts)
    .map((p, i) => ({
      rank: i + 1,
      slug: p.slug,
      name: p.name,
      pos: p.pos,
      pts: Math.round(p.startedPts * 100) / 100,
      games: p.startedGames,
    }));

  await writeFile(
    path.join(DATA, "players.json"),
    JSON.stringify({ index, players: detail }),
  );

  // A slim proPlayer.id -> slug map, written separately because it IS traced
  // into the serverless bundle (next.config.ts): live game pages need it at
  // request time to link players, and the full players.json is 50x larger.
  const slugById = {};
  for (const p of list) slugById[p.id] = p.slug;
  await writeFile(path.join(DATA, "player-slugs.json"), JSON.stringify(slugById));
  console.log(`players.json: ${list.length} players (+ player-slugs.json)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
