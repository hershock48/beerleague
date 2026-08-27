export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Pouring">
      <div className="skeleton h-9 w-64 mb-6" />
      <div className="space-y-8">
        <div className="skeleton h-72" />
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}
