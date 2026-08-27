// One normalizer for Fleaflicker box scores, shared by the archive reader
// (lib/archive.ts, completed seasons from disk) and the live fetcher
// (lib/live.ts, current season from the API), because the raw JSON is the
// same shape in both places and a divergence here would mean two game pages
// that disagree about the same game.

export interface BoxPlayer {
  name: string;
  pos: string;
  pts: number | null;
}

export interface BoxSlot {
  label: string;
  away: BoxPlayer | null;
  home: BoxPlayer | null;
}

export interface BoxGroup {
  label: "Starters" | "Bench" | "Injured";
  slots: BoxSlot[];
}

export interface BoxScore {
  week: number;
  away: { id: number; name: string; pts: number | null };
  home: { id: number; name: string; pts: number | null };
  isFinal: boolean;
  groups: BoxGroup[];
}

interface RawSide {
  proPlayer?: { nameFull?: string; position?: string };
  viewingActualPoints?: { value?: number };
}

interface RawBox {
  week?: number;
  scoringPeriod?: { value?: number };
  game?: {
    away?: { id?: number; name?: string };
    home?: { id?: number; name?: string };
    awayScore?: { score?: { value?: number } };
    homeScore?: { score?: { value?: number } };
    isFinalScore?: boolean;
  };
  lineups?: {
    group?: string;
    slots?: { position?: { label?: string }; away?: RawSide; home?: RawSide }[];
  }[];
}

function side(raw: RawSide | undefined): BoxPlayer | null {
  if (!raw?.proPlayer?.nameFull) return null;
  return {
    name: raw.proPlayer.nameFull,
    pos: raw.proPlayer.position ?? "",
    pts: raw.viewingActualPoints?.value ?? null,
  };
}

export function normalizeBox(raw: unknown): BoxScore | null {
  const box = raw as RawBox;
  const g = box?.game;
  if (!g?.away || !g?.home) return null;

  const groups: BoxGroup[] = [];
  for (const lineup of box.lineups ?? []) {
    const label: BoxGroup["label"] =
      lineup.group === "START"
        ? "Starters"
        : lineup.group === "INJURED"
          ? "Injured"
          : "Bench";
    const slots: BoxSlot[] = (lineup.slots ?? [])
      .map((s) => ({
        label: s.position?.label ?? "",
        away: side(s.away),
        home: side(s.home),
      }))
      .filter((s) => s.away !== null || s.home !== null);
    if (slots.length > 0) groups.push({ label, slots });
  }

  return {
    week: box.week ?? box.scoringPeriod?.value ?? 0,
    away: {
      id: g.away.id ?? 0,
      name: g.away.name ?? "",
      pts: g.awayScore?.score?.value ?? null,
    },
    home: {
      id: g.home.id ?? 0,
      name: g.home.name ?? "",
      pts: g.homeScore?.score?.value ?? null,
    },
    isFinal: Boolean(g.isFinalScore),
    groups,
  };
}
