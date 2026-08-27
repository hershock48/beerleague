export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Pouring">
      <div className="skeleton h-9 w-52 mb-6" />
      <div className="flex flex-wrap gap-1 mb-6">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="skeleton h-9 w-10" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    </div>
  );
}
