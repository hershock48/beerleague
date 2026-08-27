"use client";
// One "whose team are you" choice for the whole site. Picked once (the news
// feed's selector), stored in localStorage, and read by every component that
// personalizes: the news filter and the gameday board. A custom event keeps
// components in the same tab in sync; the storage event covers other tabs.
// Storage access is wrapped: private windows and blocked site data must not
// break anything, they just forget the choice.
import { useSyncExternalStore } from "react";

const KEY = "beerleague.myTeam";
const EVENT = "beerleague:myteam";

export function readMyTeam(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function writeMyTeam(id: number): void {
  try {
    if (id) localStorage.setItem(KEY, String(id));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The picked team id, 0 for none. Server snapshot is 0, so the first paint
 *  matches the server HTML and personalization applies after hydration. */
export function useMyTeam(): number {
  return useSyncExternalStore(subscribe, readMyTeam, () => 0);
}
