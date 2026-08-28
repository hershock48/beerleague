// The chalkboard play behind the tap room title: O's running routes against
// X's, one route in volt because that guy is open. Pure decoration
// (aria-hidden), drawn inline so it costs no request. Static; nothing moves.
// width/height are stated because a viewBox alone has no intrinsic size and
// Safari falls back to 150px (glaze.md failure log).
export default function PlayDiagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 170"
      width="340"
      height="170"
      aria-hidden="true"
      className={className}
    >
      <g stroke="var(--color-chalk)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5">
        {/* defense */}
        <path d="M52 38l12 12M64 38L52 50" />
        <path d="M132 26l12 12M144 26l-12 12" />
        <path d="M216 40l12 12M228 40l-12 12" />
        <path d="M286 30l12 12M298 30l-12 12" />
        {/* offense */}
        <circle cx="70" cy="128" r="10" />
        <circle cx="140" cy="140" r="10" />
        <circle cx="252" cy="132" r="10" />
        <circle cx="310" cy="120" r="10" />
        {/* routes */}
        <path d="M140 128 q6 -44 -20 -66" strokeDasharray="6 7" />
        <path d="M252 120 q2 -34 30 -52" strokeDasharray="6 7" />
      </g>
      {/* the open man, in volt */}
      <g stroke="var(--color-volt)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85">
        <circle cx="196" cy="146" r="10" />
        <path d="M196 134 q-4 -40 22 -58 q20 -14 44 -10" strokeDasharray="7 8" />
        <path d="M254 60 l12 4 l-9 9" />
      </g>
    </svg>
  );
}
