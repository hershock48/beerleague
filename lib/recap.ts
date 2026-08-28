// The Recap engine: turns one completed week of games and box scores into
// the Wednesday column, deterministically. No model, no key: the prose is
// templated with seeded variety, so the same week always reads the same and
// different weeks do not open with the same line. The section list follows
// what the newsletter research said works: the moments, celebrate and shame,
// standings to keep everyone humble, next week with a pick.
//
// House voice rules apply: plain words, no em dashes, nothing repeated
// until it becomes a tic.
import type { BoxScore } from "./box";

export interface RecapGame {
  id: string;
  away: { id: number; name: string; pts: number };
  home: { id: number; name: string; pts: number };
}

export interface RecapAward {
  label: string;
  who: string;
  detail: string;
  tone: "win" | "loss" | "neutral";
}

export interface RecapGameNote {
  gameId: string;
  line: string;
}

export interface Recap {
  year: number;
  week: number;
  title: string;
  lede: string;
  awards: RecapAward[];
  gameNotes: RecapGameNote[];
  standings: { name: string; record: string }[];
  nextWeek: { line: string; games: { id: string; away: string; home: string }[] } | null;
}

// Seeded pick so a given week always draws the same phrasing.
function pick<T>(options: T[], seed: number): T {
  return options[seed % options.length];
}

const fmt = (n: number) => n.toFixed(2);

export function buildRecap(input: {
  year: number;
  week: number;
  games: RecapGame[];
  boxes: BoxScore[];
  recordsThrough: Map<number, { name: string; w: number; l: number; t: number }>;
  nextWeekGames: { id: string; away: string; home: string }[];
  isChampionshipWeek: boolean;
  /** For archived championship weeks: who actually took the title, so the
   *  lede names the champion and not whichever consolation game was loudest. */
  champion?: { name: string; runnerUp: string | null };
}): Recap {
  const { year, week, games, boxes } = input;
  const seed = year * 100 + week;

  const sides = games.flatMap((g) => [
    { team: g.away, opp: g.home, gameId: g.id },
    { team: g.home, opp: g.away, gameId: g.id },
  ]);
  const top = [...sides].sort((a, b) => b.team.pts - a.team.pts)[0];
  const low = [...sides].sort((a, b) => a.team.pts - b.team.pts)[0];
  const byMargin = [...games].sort(
    (a, b) => Math.abs(a.away.pts - a.home.pts) - Math.abs(b.away.pts - b.home.pts),
  );
  const closest = byMargin[0];
  const blowout = byMargin[byMargin.length - 1];
  const blowoutWinner = blowout.away.pts > blowout.home.pts ? blowout.away : blowout.home;
  const blowoutLoser = blowout.away.pts > blowout.home.pts ? blowout.home : blowout.away;
  const closeWinner = closest.away.pts > closest.home.pts ? closest.away : closest.home;
  const closeLoser = closest.away.pts > closest.home.pts ? closest.home : closest.away;
  const closeMargin = Math.abs(closest.away.pts - closest.home.pts);
  const blowMargin = Math.abs(blowout.away.pts - blowout.home.pts);

  // Player superlatives from the boxes
  let star: { player: string; pts: number; team: string } | null = null;
  let benchCrime: { player: string; pts: number; team: string } | null = null;
  for (const box of boxes) {
    for (const group of box.groups) {
      for (const slot of group.slots) {
        for (const side of ["away", "home"] as const) {
          const p = slot[side];
          if (!p || p.pts === null) continue;
          const teamName = box[side].name;
          if (group.label === "Starters" && (!star || p.pts > star.pts)) {
            star = { player: p.name, pts: p.pts, team: teamName };
          }
          if (group.label === "Bench" && (!benchCrime || p.pts > benchCrime.pts)) {
            benchCrime = { player: p.name, pts: p.pts, team: teamName };
          }
        }
      }
    }
  }

  const ledes = input.isChampionshipWeek
    ? input.champion
      ? [
          `Championship week at the bar, and ${input.champion.name} walked out with the ${year} title${input.champion.runnerUp ? ` over ${input.champion.runnerUp}` : ""}. Everyone else just paid their tab.`,
          `Last call for ${year}. ${input.champion.name} took the crown${input.champion.runnerUp ? `, ${input.champion.runnerUp} took the long walk home` : ""}, and the banner goes up tonight.`,
        ]
      : [
          `Championship week at the bar. Somebody played for keeps, and the ${year} season poured its last.`,
          `Last call for ${year}. The title game is in the books and the banners are being measured.`,
        ]
    : [
        `Week ${week} is in the books, and somebody owes ${closeLoser.name} a consolation round: a ${fmt(closeMargin)}-point loss stings all winter.`,
        `Another week on the tap. ${top.team.name} drank deepest at ${fmt(top.team.pts)}, and ${low.team.name} would rather not talk about it.`,
        `Week ${week} came and went, and the gap between the top of the bar and the bottom was ${fmt(top.team.pts - low.team.pts)} points of pure embarrassment.`,
        `The week ${week} board is final. ${blowoutWinner.name} ran up the score, ${closeWinner.name} stole one, and the standings did their weekly shuffle.`,
      ];

  const awards: RecapAward[] = [
    {
      label: "Pour of the Week",
      who: top.team.name,
      detail: `${fmt(top.team.pts)} points on ${top.opp.name}, the week's high pour.`,
      tone: "win",
    },
    {
      label: "Skunked",
      who: low.team.name,
      detail: `${fmt(low.team.pts)} points. The keg was foam.`,
      tone: "loss",
    },
    {
      label: "Bar Fight",
      who: closeWinner.name,
      detail: `edged ${closeLoser.name} by ${fmt(closeMargin)}. Somebody check the kicker's shoes.`,
      tone: "neutral",
    },
    {
      label: "Overserved",
      who: blowoutLoser.name,
      detail: `lost to ${blowoutWinner.name} by ${fmt(blowMargin)}. There is no spinning that one.`,
      tone: "loss",
    },
  ];
  if (star) {
    awards.push({
      label: "Player of the Week",
      who: star.player,
      detail: `${fmt(star.pts)} for ${star.team}. Carried the tab.`,
      tone: "win",
    });
  }
  if (benchCrime && benchCrime.pts >= 15) {
    awards.push({
      label: "Bench Crime",
      who: benchCrime.team,
      detail: `left ${benchCrime.player} and his ${fmt(benchCrime.pts)} points on the pine.`,
      tone: "loss",
    });
  }

  // A closing phrase may appear once per column and no more; the same tail
  // twice in one recap reads as a tic (glaze.md, copy is counted).
  const usedTails = new Set<number>();
  const takeTail = (options: string[], gSeed: number): string => {
    for (let i = 0; i < options.length; i++) {
      const idx = (gSeed + i) % options.length;
      if (!usedTails.has(idx * 1000 + options.length)) {
        usedTails.add(idx * 1000 + options.length);
        return options[idx];
      }
    }
    return options[gSeed % options.length];
  };

  const gameNotes: RecapGameNote[] = games.map((g) => {
    const winner = g.away.pts > g.home.pts ? g.away : g.home;
    const loser = g.away.pts > g.home.pts ? g.home : g.away;
    const margin = Math.abs(g.away.pts - g.home.pts);
    const gSeed = seed + (parseInt(g.id, 10) % 997);
    const score = `${fmt(winner.pts)} to ${fmt(loser.pts)}`;
    let line: string;
    if (margin < 5) {
      line = takeTail(
        [
          `${winner.name} ${fmt(winner.pts)}, ${loser.name} ${fmt(loser.pts)}. Decided by pocket change.`,
          `${winner.name} over ${loser.name}, ${score}. One flexed player from going the other way.`,
          `${winner.name} escaped ${loser.name}, ${score}. Exhale.`,
        ],
        gSeed,
      );
    } else if (margin > 30) {
      line = takeTail(
        [
          `${winner.name} ${fmt(winner.pts)}, ${loser.name} ${fmt(loser.pts)}. A closed-door beating.`,
          `${winner.name} buried ${loser.name}, ${score}.`,
          `${winner.name} ran the table on ${loser.name}, ${score}.`,
        ],
        gSeed,
      );
    } else {
      line = takeTail(
        [
          `${winner.name} handled ${loser.name}, ${score}.`,
          `${winner.name} ${fmt(winner.pts)}, ${loser.name} ${fmt(loser.pts)}. Workmanlike.`,
          `${winner.name} took it from ${loser.name}, ${score}.`,
          `${winner.name} outpoured ${loser.name}, ${score}.`,
          `${winner.name} kept ${loser.name} at arm's length, ${score}.`,
          `${winner.name} got there first, ${score} over ${loser.name}.`,
        ],
        gSeed,
      );
    }
    return { gameId: g.id, line };
  });

  const standings = [...input.recordsThrough.values()]
    .sort((a, b) => b.w - a.w || a.l - b.l)
    .map((r) => ({ name: r.name, record: `${r.w}-${r.l}${r.t ? `-${r.t}` : ""}` }));

  let nextWeek: Recap["nextWeek"] = null;
  if (input.nextWeekGames.length > 0) {
    const gameOfWeek = input.nextWeekGames[0];
    nextWeek = {
      line: pick(
        [
          `Next week the board turns over again. Circle ${gameOfWeek.away} at ${gameOfWeek.home}.`,
          `On deck: ${input.nextWeekGames.length} more games. The one worth a stool: ${gameOfWeek.away} at ${gameOfWeek.home}.`,
        ],
        seed,
      ),
      games: input.nextWeekGames,
    };
  }

  return {
    year,
    week,
    title: input.isChampionshipWeek
      ? `The ${year} Championship Recap`
      : `Week ${week}, ${year}: Last Call`,
    lede: pick(ledes, seed),
    awards,
    gameNotes,
    standings,
    nextWeek,
  };
}
