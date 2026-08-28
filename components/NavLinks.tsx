"use client";
// The header tabs, with the current section lit. Client-side only because
// the active state needs the pathname; the links themselves are the same
// server-rendered anchors either way.
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Tap Room" },
  { href: "/scores", label: "Scores" },
  { href: "/standings", label: "Standings" },
  { href: "/seasons", label: "Seasons" },
  { href: "/franchises", label: "Franchises" },
  { href: "/players", label: "Players" },
  { href: "/records", label: "Record Book" },
] as const;

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex flex-wrap gap-1 pb-0 text-sm">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            {/* py grows the tap target past 24px; the look stays a quiet tab */}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`block px-3 py-3 border-b-2 transition-colors ${
                active
                  ? "text-amber border-amber"
                  : "text-parch border-transparent hover:text-amber hover:border-amber"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
