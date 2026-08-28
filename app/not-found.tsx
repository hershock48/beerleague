import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="marker text-6xl text-volt glow mb-4 -rotate-2">404</p>
      <h1 className="text-xl text-ice mb-2">That one&apos;s not on tap.</h1>
      <p className="text-steel mb-8">
        The page you asked for is not behind this bar.
      </p>
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <Link
          href="/"
          className="px-4 py-2 rounded border border-volt text-volt hover:bg-volt hover:text-ground transition-colors"
        >
          Back to the Tap Room
        </Link>
        <Link
          href="/records"
          className="px-4 py-2 rounded border border-edge text-steel hover:text-volt hover:border-volt transition-colors"
        >
          Read the record book instead
        </Link>
      </div>
    </div>
  );
}
