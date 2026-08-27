// Instant shell for the tap room while the server talks to Fleaflicker and
// ESPN. Shapes roughly match the real page so the swap does not jolt.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Pouring">
      <div className="skeleton h-9 w-56 mb-3" />
      <div className="skeleton h-5 w-80 mb-8" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          <div className="skeleton h-5 w-44 mb-4" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-32" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="skeleton h-5 w-28" />
          <div className="skeleton h-64" />
        </div>
      </div>
    </div>
  );
}
