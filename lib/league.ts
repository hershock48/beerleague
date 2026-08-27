// Every league fact lives here, one place, so a correction is one edit.
// Surfaces that cannot read from this file: none yet. If one appears
// (an OG image, a hand-drawn asset), name it here and in the README.

export const LEAGUE_ID = 37401;
export const LEAGUE_NAME = "The Beer League";
export const FIRST_SEASON = 2007;
export const CURRENT_SEASON = 2026;
export const FLEAFLICKER_URL = `https://www.fleaflicker.com/nfl/leagues/${LEAGUE_ID}`;
export const API_BASE = "https://www.fleaflicker.com/api";

// The era split: the league began life in 2007 with candy-bar team names
// (Snickers, Twizzlers, Gobstoppers) and became the Beer League when the
// names went to beer. Shown on history pages as a real piece of lore.
export const CANDY_ERA_NOTE =
  "The league predates its own name: the first seasons were played under candy names before the taps took over.";

export function apiUrl(
  endpoint: string,
  params: Record<string, string | number> = {},
): string {
  const qs = new URLSearchParams({
    sport: "NFL",
    league_id: String(LEAGUE_ID),
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  return `${API_BASE}/${endpoint}?${qs}`;
}
