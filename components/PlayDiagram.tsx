// The chalkboard play behind the tap room title, and it draws itself: the
// defense appears first, the offense sets, the routes draw, and the open
// man's route lands last with the arrowhead. Every stroke is pathLength=1
// so one dasharray animation fits all; the BASE state is fully drawn and
// the keyframes pull it back (glaze.md: the un-animated state is the
// finished state), so reduced motion shows the complete play. Delays are
// desynchronized 150-300ms apart so it reads as a hand drawing, not a
// slide transition. Pure decoration (aria-hidden), drawn inline.
// width/height are stated because a viewBox alone has no intrinsic size
// and Safari falls back to 150px (glaze.md failure log).

const D = (delay: number) => ({ style: { animationDelay: `${delay}s` } });

export default function PlayDiagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 170"
      width="340"
      height="170"
      aria-hidden="true"
      className={className}
    >
      <g stroke="var(--color-chalk)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.85">
        {/* defense */}
        <path className="draw-stroke" pathLength={1} d="M52 38l12 12M64 38L52 50" {...D(0)} />
        <path className="draw-stroke" pathLength={1} d="M132 26l12 12M144 26l-12 12" {...D(0.15)} />
        <path className="draw-stroke" pathLength={1} d="M216 40l12 12M228 40l-12 12" {...D(0.3)} />
        <path className="draw-stroke" pathLength={1} d="M286 30l12 12M298 30l-12 12" {...D(0.45)} />
        {/* offense */}
        <circle className="draw-stroke" pathLength={1} cx="70" cy="128" r="10" {...D(0.65)} />
        <circle className="draw-stroke" pathLength={1} cx="140" cy="140" r="10" {...D(0.8)} />
        <circle className="draw-stroke" pathLength={1} cx="252" cy="132" r="10" {...D(0.95)} />
        <circle className="draw-stroke" pathLength={1} cx="310" cy="120" r="10" {...D(1.1)} />
        {/* routes are dashed, and the .draw-stroke dasharray would erase the
            dash pattern (CSS beats presentation attributes), so they fade */}
        <path className="pop-in" d="M140 128 q6 -44 -20 -66" strokeDasharray="6 7" {...D(1.35)} />
        <path className="pop-in" d="M252 120 q2 -34 30 -52" strokeDasharray="6 7" {...D(1.55)} />
      </g>
      {/* the open man, in marker volt */}
      <g stroke="var(--color-volt)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9">
        <circle className="draw-stroke" pathLength={1} cx="196" cy="146" r="10" {...D(1.25)} />
        <path
          className="pop-in"
          d="M196 134 q-4 -40 22 -58 q20 -14 44 -10"
          strokeDasharray="7 8"
          {...D(1.8)}
        />
        <path className="pop-in" d="M254 60 l12 4 l-9 9" {...D(2.4)} />
      </g>
    </svg>
  );
}
