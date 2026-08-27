# The Beer League

The Beer League's own site: live scores, standings, news, and two decades of
league history for a 12-team fantasy football league that has run on
Fleaflicker since 2007. Lives at beerleague.glazedweb.com. Not a client site;
this is Kevin's own league.

Fleaflicker (league 37401) stays the system of record. Lineups, waivers,
trades and the draft still happen there; its API is read-only, so this site
is the experience layer on top: everything you look at, nothing you click to
transact.

## How it runs

Next.js App Router + TypeScript + Tailwind 4, deployed on Vercel from this
repo. No database and no secrets: historical data is committed JSON, live
data is fetched server-side from public no-key APIs with fetch-cache
throttling.

Three data planes:

1. **The archive** (`data/`): every completed season 2007 onward, pulled once
   by `tools/sync.mjs` and committed. Standings, every weekly scoreboard,
   every box score (player-level), draft boards. `tools/derive.mjs` distills
   it into `data/derived.json` (franchises, champions, head-to-head, record
   book), which is what pages actually read.
2. **Live Fleaflicker** (`lib/live.ts`): current-season scoreboard (30s
   cache), standings, rosters, transactions (5 min). The scoreboard client
   island re-polls `/api/scoreboard` every 60s; the fetch cache means any
   number of viewers costs at most two upstream calls a minute.
3. **The outside world** (`lib/news.ts`): ESPN NFL headlines (unofficial but
   long-stable public JSON API, 15 min cache) cross-referenced against every
   league roster so the feed can filter to one team's players; Sleeper's
   public trending-adds feed (hourly cache; its ~10MB player DB is cached
   24h).

## Yearly ritual (the only maintenance there is)

After the season ends (or any time you want the archive current):

```
node tools/sync.mjs
node tools/derive.mjs
git add data && git commit && git push
```

Then bump `CURRENT_SEASON` in `lib/league.ts` and `currentSeason` in
`tools/sync.mjs` when the new season starts. Those are the only two places a
year is written.

## Traps (this will break if you do not know)

- **Fleaflicker rate-limits by IP with a bare nginx 403**, not a 429. The
  first sync run at concurrency 4 got blocked after ~370 requests; the block
  lifted on its own within the hour. `tools/sync.mjs` now runs one request
  at a time, 700ms apart, and treats 403/429 as "wait minutes." Do not
  speed it up; the archive only downloads once.
- **`recordPostseason.rank` is the playoff seed, not the finish.** 2013:
  the 1 seed went 1-1 while the 5 seed went 3-0 and won the title. Champions
  are derived from playoff games in `tools/derive.mjs` (undefeated in the
  postseason, best seed among unbeaten). The reasoning and proof live in
  that file's header.
- **Historical box scores report a player's CURRENT NFL team** (a 2009 box
  shows Philip Rivers as "FA"). Names and positions are durable; teams are
  not. Nothing historical displays a player's NFL team.
- **Season 2006 exists in the API but is an echo** of current teams with 0-0
  records. `FIRST_SEASON` is 2007 everywhere.
- **The `.complete` markers in `data/seasons/*/`** mean "every box score
  verified on disk." Delete one to force a season to re-sync.
- **ESPN and Sleeper are unofficial/no-key APIs.** Either can vanish; every
  consumer degrades to an empty list and the section hides itself. Nothing
  on the site hard-depends on them.

## Named seam: expert rankings

FantasyPros is the expert-consensus source (Fleaflicker sells it as their
paid add-on). Their API needs a key (free for personal use, requested from
their developer page). If Kevin gets one: add a fetcher in `lib/news.ts`
following the pattern there, set the key in the Vercel dashboard, and read
it from `process.env.FANTASYPROS_API_KEY`. Until then the site deliberately
ships without rankings rather than scraping them.

## Before-launch checklist

- [x] Zero accessibility violations at 390 and 1440 (audit.mjs, 10 routes, 2026-08-27)
- [x] Widths 320 / 390 / 768 / 1440 clean (width-check.mjs + audit.mjs, 2026-08-27)
- [x] Every route has its own title and meta description
- [x] Production build audited (next build + next start; LCP ~740ms, CLS <0.08, JS 135KB)
- [ ] beerleague.glazedweb.com attached and serving, verified in production
- [ ] Full archive re-synced after the 2026 season ends (ritual above)
