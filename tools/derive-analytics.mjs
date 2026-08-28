#!/usr/bin/env node
// The Ledger's data: league-wide analytics distilled from the archive.
// Writes data/analytics.json, read at BUILD TIME ONLY (the page is SSG),
// so it is deliberately not traced into the serverless bundle.
// Run after sync/derive, alongside the other derive scripts.
//
// What it computes and why the math is what it is:
// - Scoring eras: average points per team-game per season. Uses only games
//   with real scores, so 2026's empty schedule contributes nothing.
// - Position eras: average points per START by position per season - the
//   value of a QB start vs an RB start over two decades.
// - Pythagorean luck: expected wins from season PF/PA with exponent 2.37
//   (the fantasy-football convention), against actual wins. Positive delta
//   means winning more than the points earned - luck, schedule, or clutch.
// - Clutch: record in games decided by fewer than 5 points.
// - Bench waste: total points scored by players a franchise left on the
//   bench. Not lineup-optimal analysis, just the raw pile.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DATA = path.join(import.meta.dirname, "..", "data");
const EXP = 2.37;

const readJson = async (rel) =>
  JSON.parse(await readFile(path.join(DATA, rel), "utf8"));

async function main() {
  const derived = await readJson("derived.json");
  const seasons = (await readdir(path.join(DATA, "seasons")))
    .filter((d) => /^\d{4}$/.test(d)).map(Number).sort();

  const seasonScoring = [];
  const posErasByYear = [];
  const clutch = new Map(); // teamId -> {w,l}
  const benchWaste = new Map(); // teamId -> pts

  for (const year of seasons) {
    // Scoring + clutch from week files
    let totalPts = 0, teamGames = 0;
    let top = null;
    const weekFiles = (await readdir(path.join(DATA, "seasons", String(year))))
      .filter((f) => f.startsWith("week-"));
    for (const wf of weekFiles) {
      const board = await readJson(`seasons/${year}/${wf}`);
      for (const g of board.games ?? []) {
        const as = g.awayScore?.score?.value;
        const hs = g.homeScore?.score?.value;
        if (as === undefined || hs === undefined || (as === 0 && hs === 0)) continue;
        totalPts += as + hs;
        teamGames += 2;
        for (const [side, my, their] of [[g.away, as, hs], [g.home, hs, as]]) {
          if (my > top?.pts || !top) top = { team: side.name, pts: my };
          if (Math.abs(as - hs) < 5 && as !== hs) {
            const c = clutch.get(side.id) ?? { w: 0, l: 0 };
            if (my > their) c.w++; else c.l++;
            clutch.set(side.id, c);
          }
        }
      }
    }
    if (teamGames === 0) continue;
    seasonScoring.push({
      year,
      avg: Math.round((totalPts / teamGames) * 100) / 100,
      top,
    });

    // Position eras + bench waste from box files
    const boxDir = path.join(DATA, "seasons", String(year), "box");
    if (!existsSync(boxDir)) continue;
    const pos = { QB: [0, 0], RB: [0, 0], WR: [0, 0], TE: [0, 0] };
    for (const bf of await readdir(boxDir)) {
      const box = await readJson(`seasons/${year}/box/${bf}`);
      if (!box.game) continue;
      for (const group of box.lineups ?? []) {
        const isStart = group.group === "START";
        const isBench = !group.group && group.slots?.[0]?.position?.label === "BN";
        if (!isStart && !isBench) continue;
        for (const slot of group.slots ?? []) {
          for (const side of ["away", "home"]) {
            const p = slot[side];
            if (!p?.proPlayer) continue;
            const pts = p.viewingActualPoints?.value ?? 0;
            if (isStart && pos[p.proPlayer.position]) {
              pos[p.proPlayer.position][0] += pts;
              pos[p.proPlayer.position][1]++;
            }
            if (isBench && pts > 0) {
              const id = box.game[side].id;
              benchWaste.set(id, (benchWaste.get(id) ?? 0) + pts);
            }
          }
        }
      }
    }
    posErasByYear.push({
      year,
      ...Object.fromEntries(
        Object.entries(pos).map(([k, [sum, n]]) => [
          k,
          n > 0 ? Math.round((sum / n) * 100) / 100 : null,
        ]),
      ),
    });
  }

  // Franchise-level: luck, clutch, bench waste, for ACTIVE franchises
  const active = Object.values(derived.franchises).filter((f) => f.active);
  const nameOf = Object.fromEntries(active.map((f) => [f.id, f.currentName]));

  const luckSeasons = [];
  const luck = active.map((f) => {
    let expW = 0, actW = 0, games = 0;
    for (const s of f.seasons) {
      if (s.year >= 2026) continue;
      const [w, l, t = 0] = s.record.split("-").map(Number);
      const pf = Number(s.pf.replace(/,/g, ""));
      const pa = Number(s.pa.replace(/,/g, ""));
      if (pf + pa === 0) continue;
      const g = w + l + t;
      const e = g * (pf ** EXP / (pf ** EXP + pa ** EXP));
      expW += e; actW += w; games += g;
      luckSeasons.push({
        id: f.id, name: s.name, year: s.year,
        delta: Math.round((w - e) * 100) / 100,
        record: s.record,
      });
    }
    return {
      id: f.id,
      name: f.currentName,
      slug: f.slug,
      expW: Math.round(expW * 10) / 10,
      actW,
      delta: Math.round((actW - expW) * 10) / 10,
      games,
    };
  }).sort((a, b) => b.delta - a.delta);
  luckSeasons.sort((a, b) => b.delta - a.delta);

  const clutchRows = active.map((f) => {
    const c = clutch.get(f.id) ?? { w: 0, l: 0 };
    return {
      id: f.id, name: f.currentName, slug: f.slug,
      w: c.w, l: c.l,
      pct: c.w + c.l > 0 ? Math.round((c.w / (c.w + c.l)) * 1000) / 10 : null,
    };
  }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  const benchRows = active.map((f) => ({
    id: f.id, name: f.currentName, slug: f.slug,
    pts: Math.round(benchWaste.get(f.id) ?? 0),
  })).sort((a, b) => b.pts - a.pts);

  // Grudge grid: all-time H2H among active franchises
  const grid = active.map((rowF) => ({
    id: rowF.id,
    name: rowF.currentName,
    slug: rowF.slug,
    cells: active.map((colF) => {
      if (rowF.id === colF.id) return null;
      const [lo, hi] = [rowF.id, colF.id].sort((a, b) => a - b);
      const pair = derived.h2h[`${lo}-${hi}`];
      if (!pair) return { w: 0, l: 0, t: 0 };
      const mine = rowF.id === lo ? pair.a : pair.b;
      return { w: mine.w, l: mine.l, t: mine.t };
    }),
  }));

  // Last completed season's Oberon Mt. power ratings (6x avg + 2x(high+low)
  // + 2x(winPct x 200)), the preseason baseline for /rankings before any
  // current-season games exist. Needs each team's high and low week, which
  // only the week files know.
  const lastYear = Math.max(...seasons.filter((y) => {
    const s = derived.seasons.find((x) => x.year === y);
    return s && !s.isCurrent;
  }));
  const oberon = new Map(); // teamId -> {pts:[], w, l}
  {
    const dir = path.join(DATA, "seasons", String(lastYear));
    for (const wf of (await readdir(dir)).filter((f) => f.startsWith("week-"))) {
      const board = await readJson(`seasons/${lastYear}/${wf}`);
      for (const g of board.games ?? []) {
        const as = g.awayScore?.score?.value;
        const hs = g.homeScore?.score?.value;
        if (as === undefined || hs === undefined || (as === 0 && hs === 0)) continue;
        for (const [side, my, their] of [[g.away, as, hs], [g.home, hs, as]]) {
          const o = oberon.get(side.id) ?? { pts: [], w: 0, l: 0 };
          o.pts.push(my);
          if (my > their) o.w++; else if (my < their) o.l++;
          oberon.set(side.id, o);
        }
      }
    }
  }
  const preseasonPoll = active
    .map((f) => {
      const o = oberon.get(f.id);
      if (!o || o.pts.length === 0) return null;
      const avg = o.pts.reduce((a, b) => a + b, 0) / o.pts.length;
      const rating =
        avg * 6 +
        (Math.max(...o.pts) + Math.min(...o.pts)) * 2 +
        (o.w / (o.w + o.l)) * 200 * 2;
      return {
        id: f.id, name: f.currentName, slug: f.slug,
        rating: Math.round(rating * 10) / 10,
        avg: Math.round(avg * 100) / 100,
        record: `${o.w}-${o.l}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.rating - a.rating);

  const analytics = {
    seasonScoring,
    posEras: posErasByYear,
    luck,
    luckiestSeasons: luckSeasons.slice(0, 5),
    unluckiestSeasons: luckSeasons.slice(-5).reverse(),
    clutch: clutchRows,
    benchWaste: benchRows,
    grid,
    nameOf,
    preseason: { year: lastYear, poll: preseasonPoll },
  };
  await writeFile(path.join(DATA, "analytics.json"), JSON.stringify(analytics));
  console.log(
    `analytics.json: ${seasonScoring.length} seasons, ${active.length} franchises`,
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
