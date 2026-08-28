// Live draft board for the polling client on /draft. The 20s fetch cache
// in lib/live.ts is the throttle, same pattern as /api/scoreboard.
import { NextResponse } from "next/server";
import { getLiveDraftBoard } from "@/lib/live";

export async function GET() {
  const board = await getLiveDraftBoard();
  if (!board) {
    return NextResponse.json({ error: "fleaflicker unreachable" }, { status: 502 });
  }
  return NextResponse.json(board);
}
