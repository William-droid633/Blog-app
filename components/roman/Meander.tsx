/** Frise grecque (méandre) — l'ornement signature du musée. */
export default function Meander({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-4 w-full text-gold/60 ${className}`} aria-hidden="true">
      <defs>
        <pattern
          id="meander-fret"
          width="20"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 15 H20 M19 15 V1 H6 V9 H12.5 V5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#meander-fret)" />
    </svg>
  );
}
