// Live scoreboard for the polling client on the home and scores pages.
// The fetch cache (30s in lib/live.ts) is the throttle: any number of
// visitors polling produces at most two Fleaflicker calls a minute.
import { NextResponse } from "next/server";
import { getScoreboard } from "@/lib/live";

export async function GET(request: Request) {
  const week = new URL(request.url).searchParams.get("week");
  const board = await getScoreboard(week ? Number(week) : undefined);
  if (!board) {
    return NextResponse.json({ error: "fleaflicker unreachable" }, { status: 502 });
  }
  return NextResponse.json(board);
}
