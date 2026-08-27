#!/usr/bin/env node
// The stats engine. Reads the raw archive in data/ and writes data/derived.json,
// which is everything the site renders about history: franchises, champions,
// head-to-head, streaks, and the record book. Run after tools/sync.mjs.
//
// Why precomputed: the raw archive is ~150MB of box scores. Walking it at
// request time (or even every build) is waste; the answers never change once
// a season is complete. derived.json is a few hundred KB and is committed.
//
// Facts learned from the data, encoded here rather than re-derived wrong:
// - recordPostseason.rank is the playoff SEED, not the finish. 2013 proves
//   it: King Cobra holds rank 1 with a 1-1 postseason while PBR went 3-0
//   and won the final-week title game as rank 5. (2009 was misleading:
//   the 1 seed happened to win it all, so rank looked like finish.)
//   The champion is therefore derived from games, not ranks: the team that
//   went UNDEFEATED in the playoff weeks with the best seed among unbeaten
//   teams. Consolation brackets also produce unbeaten teams (Hamm's went
//   3-0 in the 2013 consolation) but always at worse seeds. A seed that
//   loses in the title bracket finishes with a loss, so it cannot collide.
// - The runner-up is whoever the champion beat in its final playoff game.
// - Regular season length = wins+losses+ties of any team's overall record.
//   Weeks past that are playoffs.
// - Historical box scores report a player's CURRENT NFL team (Philip Rivers
//   shows "FA" in a 2009 box). Never display the team next to a historical
//   performance; the name and position are the durable facts.
// - Player points live at slot.<side>.viewingActualPoints.value. The first
//   lineup group is starters; the unlabeled group is the bench.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DATA = path.join(import.meta.dirname, "..", "data");
const CURRENT_SEASON = 2026;

const readJson = async (rel) =>
  JSON.parse(await readFile(path.join(DATA, rel), "utf8"));

const val = (score) => score?.score?.value ?? score?.value ?? null;

function emptyTally() {
  return { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
}

function addGame(tally, my, their) {
  tally.pf += my;
  tally.pa += their;
  if (my > their) tally.w++;
  else if (my < their) tally.l++;
  else tally.t++;
}

async function main() {
  const seasonDirs = (await readdir(path.join(DATA, "seasons"))).
    filter((d) => /^\d{4}$/.test(d)).map(Number).sort();

  const franchises = {}; // teamId -> franchise record
  const h2h = {}; // "lowId-highId" -> {a: tally for lowId, b: tally for highId}
  const seasons = []; // per-season summaries, oldest first
  const teamWeeks = []; // every (team, week, score) for records
  const games = []; // every completed game for records
  const playerGames = []; // every (player, week, points, fantasy team) for records
  const benchGames = []; // bench-only, for the bench tragedy board

  for (const year of seasonDirs) {
    const isCurrent = year >= CURRENT_SEASON;
    const standings = await readJson(`seasons/${year}/standings.json`);
    const teams = standings.divisions.flatMap((d) =>
      d.teams.map((t) => ({ ...t, division: d.name })),
    );

    const rec = teams[0]?.recordOverall?.formatted ?? "0-0";
    const regularWeeks = rec.split("-").reduce((a, b) => a + Number(b), 0) || 13;

    // Per-team season line + franchise accumulation
    for (const t of teams) {
      const f = (franchises[t.id] ??= {
        id: t.id,
        names: {},
        owners: {},
        career: emptyTally(),
        playoffApps: 0,
        championships: [],
        runnerUps: [],
        seasons: [],
      });
      const [w, l, tie = 0] = t.recordOverall.formatted.split("-").map(Number);
      const seed = isCurrent ? null : (t.recordPostseason?.rank ?? null);
      f.names[t.name] = (f.names[t.name] ?? 0) + 1;
      for (const o of t.owners ?? []) f.owners[o.displayName] = year;
      f.career.w += w; f.career.l += l; f.career.t += tie;
      f.career.pf += Number(t.pointsFor?.formatted?.replace(/,/g, "") ?? 0);
      f.career.pa += Number(t.pointsAgainst?.formatted?.replace(/,/g, "") ?? 0);
      f.seasons.push({
        year,
        name: t.name,
        owner: t.owners?.[0]?.displayName ?? null,
        record: t.recordOverall.formatted,
        pf: t.pointsFor?.formatted ?? "0",
        pa: t.pointsAgainst?.formatted ?? "0",
        division: t.division,
        divRank: t.recordDivision?.rank ?? null,
        seed,
        postRecord: isCurrent ? null : (t.recordPostseason?.formatted ?? null),
        finish: null, // filled in below once the champion is derived from games
      });
    }

    // Walk every week's games
    const weekFiles = (await readdir(path.join(DATA, "seasons", String(year))))
      .filter((f) => f.startsWith("week-"))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

    const playoffGames = [];
    for (const wf of weekFiles) {
      const week = Number(wf.match(/\d+/)[0]);
      const board = await readJson(`seasons/${year}/${wf}`);
      for (const g of board.games ?? []) {
        const as = val(g.awayScore);
        const hs = val(g.homeScore);
        if (as === null || hs === null || (as === 0 && hs === 0)) continue;
        const isPlayoff = week > regularWeeks;
        const game = {
          year, week, isPlayoff,
          away: { id: g.away.id, name: g.away.name, pts: as },
          home: { id: g.home.id, name: g.home.name, pts: hs },
        };
        games.push(game);
        if (isPlayoff) playoffGames.push(game);
        teamWeeks.push({ year, week, id: g.away.id, name: g.away.name, pts: as, vs: g.home.name, vsPts: hs });
        teamWeeks.push({ year, week, id: g.home.id, name: g.home.name, pts: hs, vs: g.away.name, vsPts: as });

        const [lo, hi] = [g.away, g.home].sort((x, y) => x.id - y.id);
        const key = `${lo.id}-${hi.id}`;
        const pair = (h2h[key] ??= { a: emptyTally(), b: emptyTally() });
        const loPts = lo.id === g.away.id ? as : hs;
        const hiPts = hi.id === g.away.id ? as : hs;
        addGame(pair.a, loPts, hiPts);
        addGame(pair.b, hiPts, loPts);
      }
    }

    // Player performances from box scores
    const boxDir = path.join(DATA, "seasons", String(year), "box");
    if (existsSync(boxDir)) {
      for (const bf of await readdir(boxDir)) {
        const box = await readJson(`seasons/${year}/box/${bf}`);
        const g = box.game;
        if (!g) continue;
        for (let gi = 0; gi < (box.lineups ?? []).length; gi++) {
          const group = box.lineups[gi];
          const isStart = group.group === "START";
          const isBench = !group.group && group.slots?.[0]?.position?.label === "BN";
          if (!isStart && !isBench) continue;
          for (const slot of group.slots ?? []) {
            for (const side of ["away", "home"]) {
              const p = slot[side];
              const pts = p?.viewingActualPoints?.value;
              if (!p?.proPlayer || pts === undefined || pts === null) continue;
              const entry = {
                year, week: box.week,
                player: p.proPlayer.nameFull,
                pos: p.proPlayer.position,
                pts,
                teamId: g[side].id,
                team: g[side].name,
              };
              if (isStart && pts > 0) playerGames.push(entry);
              if (isBench && pts > 0) benchGames.push(entry);
            }
          }
        }
      }
    }

    // Champion, derived from playoff games (see header: ranks are seeds).
    let champion = null;
    let runnerUp = null;
    if (!isCurrent && playoffGames.length > 0) {
      const post = teams
        .map((t) => {
          const [pw = 0, pl = 0, pt = 0] = (t.recordPostseason?.formatted ?? "0-0")
            .split("-").map(Number);
          return { t, pw, pl, pt, seed: t.recordPostseason?.rank ?? 99 };
        })
        .filter((p) => p.pw > 0 && p.pl === 0 && p.pt === 0)
        .sort((a, b) => a.seed - b.seed);
      if (post.length > 0) {
        champion = post[0].t;
        const finals = playoffGames
          .filter((g) => g.away.id === champion.id || g.home.id === champion.id)
          .sort((a, b) => b.week - a.week);
        const finalGame = finals[0];
        if (finalGame) {
          const loserId =
            finalGame.away.id === champion.id ? finalGame.home.id : finalGame.away.id;
          runnerUp = teams.find((t) => t.id === loserId) ?? null;
        }
      }
    }
    // Title bracket membership, reconstructed backwards from the final:
    // everyone in the consolation bracket also gets a postseason record on
    // Fleaflicker, so "played a playoff game" is true of the whole league
    // and means nothing. Start from the two teams in the title game and walk
    // earlier playoff weeks: any game whose winner is already in the bracket
    // pulled both its teams from the bracket.
    const titleBracket = new Set();
    if (champion && runnerUp) {
      titleBracket.add(champion.id).add(runnerUp.id);
      const weeksDesc = [...new Set(playoffGames.map((g) => g.week))]
        .sort((a, b) => b - a).slice(1);
      for (const wk of weeksDesc) {
        for (const g of playoffGames.filter((g) => g.week === wk)) {
          const winner = g.away.pts > g.home.pts ? g.away.id : g.home.id;
          if (titleBracket.has(winner)) {
            titleBracket.add(g.away.id).add(g.home.id);
          }
        }
      }
    }

    // Backfill franchise records now the champion is known
    for (const t of teams) {
      const f = franchises[t.id];
      const line = f.seasons.find((s) => s.year === year);
      if (titleBracket.has(t.id)) f.playoffApps++;
      if (champion?.id === t.id) {
        f.championships.push(year);
        line.finish = "champion";
      } else if (runnerUp?.id === t.id) {
        f.runnerUps.push(year);
        line.finish = "runner-up";
      } else if (titleBracket.has(t.id)) {
        line.finish = "playoffs";
      }
    }
    const bestRegular = [...teams].sort((a, b) =>
      (b.recordOverall.winPercentage?.value ?? 0) - (a.recordOverall.winPercentage?.value ?? 0) ||
      Number(b.pointsFor?.formatted?.replace(/,/g, "") ?? 0) - Number(a.pointsFor?.formatted?.replace(/,/g, "") ?? 0),
    )[0];
    seasons.push({
      year,
      isCurrent,
      teamCount: teams.length,
      regularWeeks,
      champion: champion && { id: champion.id, name: champion.name, owner: champion.owners?.[0]?.displayName ?? null, record: champion.recordOverall.formatted },
      runnerUp: runnerUp && { id: runnerUp.id, name: runnerUp.name },
      bestRegular: bestRegular && { id: bestRegular.id, name: bestRegular.name, record: bestRegular.recordOverall.formatted, pf: bestRegular.pointsFor?.formatted },
      playoffGames: playoffGames.map((g) => ({ ...g, week: g.week })),
      standings: standings.divisions.map((d) => ({
        name: d.name,
        teams: d.teams.map((t) => ({
          id: t.id, name: t.name,
          owner: t.owners?.[0]?.displayName ?? null,
          record: t.recordOverall.formatted,
          pf: t.pointsFor?.formatted, pa: t.pointsAgainst?.formatted,
          seed: isCurrent ? null : (t.recordPostseason?.rank ?? null),
          isChampion: champion?.id === t.id,
        })),
      })),
    });
  }

  // Streaks: walk each franchise's games in order
  const streaks = [];
  for (const f of Object.values(franchises)) {
    const mine = teamWeeks.filter((tw) => tw.id === f.id)
      .sort((a, b) => a.year - b.year || a.week - b.week);
    let type = null, len = 0, start = null;
    const flush = (end) => {
      if (len >= 5) streaks.push({ id: f.id, type, len, from: start, to: end });
    };
    let prev = null;
    for (const g of mine) {
      const r = g.pts > g.vsPts ? "W" : g.pts < g.vsPts ? "L" : "T";
      if (r === type) len++;
      else { flush(prev); type = r; len = 1; start = { year: g.year, week: g.week }; }
      prev = { year: g.year, week: g.week };
    }
    flush(prev);
  }
  streaks.sort((a, b) => b.len - a.len);

  // Record book
  const top = (arr, cmp, n = 10) => [...arr].sort(cmp).slice(0, n);
  const finishedWeeks = teamWeeks.filter((tw) => tw.year < CURRENT_SEASON || tw.pts > 0);
  const records = {
    highWeeks: top(finishedWeeks, (a, b) => b.pts - a.pts),
    lowWeeks: top(finishedWeeks, (a, b) => a.pts - b.pts),
    blowouts: top(games, (a, b) =>
      Math.abs(b.away.pts - b.home.pts) - Math.abs(a.away.pts - a.home.pts)),
    nailBiters: top(games.filter((g) => g.away.pts !== g.home.pts), (a, b) =>
      Math.abs(a.away.pts - a.home.pts) - Math.abs(b.away.pts - b.home.pts)),
    seasonPF: top(
      Object.values(franchises).flatMap((f) => f.seasons
        .filter((s) => s.year < CURRENT_SEASON)
        .map((s) => ({ id: f.id, ...s, pfNum: Number(s.pf.replace(/,/g, "")) }))),
      (a, b) => b.pfNum - a.pfNum),
    playerHighs: top(playerGames, (a, b) => b.pts - a.pts, 25),
    playerHighsByPos: Object.fromEntries(
      ["QB", "RB", "WR", "TE", "K", "D/ST"].map((pos) => [
        pos, top(playerGames.filter((p) => p.pos === pos), (a, b) => b.pts - a.pts, 5),
      ])),
    benchTragedies: top(benchGames, (a, b) => b.pts - a.pts, 10),
    streaks: streaks.slice(0, 12),
  };

  // Final franchise shaping: display name = most recent season's name
  for (const f of Object.values(franchises)) {
    f.seasons.sort((a, b) => a.year - b.year);
    const latest = f.seasons[f.seasons.length - 1];
    f.currentName = latest.name;
    f.lastSeason = latest.year;
    f.active = latest.year >= CURRENT_SEASON;
    f.slug = latest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  // Two defunct franchises could share a slug; suffix the id on collision.
  const bySlug = {};
  for (const f of Object.values(franchises)) {
    if (bySlug[f.slug]) f.slug = `${f.slug}-${f.id}`;
    bySlug[f.slug] = f;
  }

  const derived = {
    generatedAt: new Date().toISOString(),
    seasons: seasons.reverse(), // newest first for display
    franchises,
    h2h,
    records,
    totals: {
      seasons: seasons.length,
      games: games.length,
      playerPerformances: playerGames.length,
    },
  };
  await writeFile(path.join(DATA, "derived.json"), JSON.stringify(derived));
  console.log(
    `derived.json: ${seasons.length} seasons, ${games.length} games, ` +
    `${Object.keys(franchises).length} franchises, ${playerGames.length} player games`,
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
