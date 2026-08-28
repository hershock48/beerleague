import type { Metadata } from "next";
import { Alfa_Slab_One, Bitter, Permanent_Marker } from "next/font/google";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";
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
// The coach's handwriting. Annotations only: tags, circled years, the 404.
// Never running text; Bitter carries anything longer than a phrase.
const marker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
});

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
  // Every page canonicalizes to its own path on the real domain, so the
  // three *.vercel.app aliases never compete with it in search.
  alternates: { canonical: "./" },
};

export const viewport = {
  themeColor: "#0b0e13",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${marker.variable}`}>
      <body className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-volt focus:text-ground focus:px-4 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <header className="border-b border-edge bg-surface/80">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-baseline justify-between gap-4 pt-5 pb-1">
              {/* The sign over the door: pink neon, like every good beer sign */}
              <Link href="/" className="font-display text-pink glow-pink text-2xl sm:text-3xl leading-none">
                {LEAGUE_NAME}
              </Link>
              <span className="plate hidden sm:block text-steel!">
                est. {FIRST_SEASON}
              </span>
            </div>
            {/* Wrapping beats a hidden horizontal scroller: a nav that scrolls
                in its own box clips its last item with no affordance
                (glaze/standards.md, the devine nav). Two rows at 320 is fine. */}
            <nav aria-label="Main">
              <NavLinks />
            </nav>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-edge mt-16">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-steel flex flex-wrap gap-x-8 gap-y-2 items-center justify-between">
            <p>
              {LEAGUE_NAME}, pouring since {FIRST_SEASON}.
            </p>
            <p>
              Rosters and lineups still live on{" "}
              <a
                href={FLEAFLICKER_URL}
                className="text-volt underline underline-offset-4 hover:no-underline"
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
