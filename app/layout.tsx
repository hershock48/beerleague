import type { Metadata } from "next";
import { Alfa_Slab_One, Bitter } from "next/font/google";
import Link from "next/link";
import { LEAGUE_NAME, FIRST_SEASON, FLEAFLICKER_URL } from "@/lib/league";
import "./globals.css";

// Self-hosted at build time via next/font. Alfa Slab is the bar-sign display
// face and is rationed to the wordmark and page titles; Bitter carries
// everything else, including every number (tabular-nums set on body).
const display = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Bitter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL("https://beerleague.glazedweb.com"),
  title: {
    default: `${LEAGUE_NAME} · Fantasy Football Since ${FIRST_SEASON}`,
    template: `%s · ${LEAGUE_NAME}`,
  },
  description:
    "The Beer League's own tap room: live scores, standings, two decades of league history, franchise records, and the record book.",
  // Defined once here. No page defines its own openGraph: Next replaces the
  // parent object wholesale instead of merging, image included (glaze.md).
  openGraph: {
    siteName: LEAGUE_NAME,
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export const viewport = {
  themeColor: "#14100a",
};

const NAV = [
  { href: "/", label: "Tap Room" },
  { href: "/scores", label: "Scores" },
  { href: "/standings", label: "Standings" },
  { href: "/seasons", label: "Seasons" },
  { href: "/franchises", label: "Franchises" },
  { href: "/records", label: "Record Book" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-edge bg-surface/80">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-baseline justify-between gap-4 pt-5 pb-1">
              <Link href="/" className="font-display text-amber glow text-2xl sm:text-3xl leading-none">
                {LEAGUE_NAME}
              </Link>
              <span className="plate hidden sm:block text-parch!">
                est. {FIRST_SEASON}
              </span>
            </div>
            {/* Wrapping beats a hidden horizontal scroller: a nav that scrolls
                in its own box clips its last item with no affordance
                (glaze/standards.md, the devine nav). Two rows at 320 is fine. */}
            <nav aria-label="Main">
              <ul className="flex flex-wrap gap-1 pb-0 text-sm">
                {NAV.map((item) => (
                  <li key={item.href}>
                    {/* py grows the tap target past 24px; the look stays a quiet tab */}
                    <Link
                      href={item.href}
                      className="block px-3 py-3 text-parch hover:text-amber border-b-2 border-transparent hover:border-amber transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-edge mt-16">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-parch flex flex-wrap gap-x-8 gap-y-2 items-center justify-between">
            <p>
              {LEAGUE_NAME}, pouring since {FIRST_SEASON}.
            </p>
            <p>
              Rosters and lineups still live on{" "}
              <a
                href={FLEAFLICKER_URL}
                className="text-amber underline underline-offset-4 hover:no-underline"
              >
                Fleaflicker
              </a>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
