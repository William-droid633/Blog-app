/**
 * Colonne romaine stylisée en pur CSS : chapiteau, fût cannelé, base.
 * Utilisée en décor architectural sur les flancs des sections.
 */
export default function ColumnDecor({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-10 flex-col items-center ${className}`} aria-hidden="true">
      {/* Abaque */}
      <div className="h-2 w-full bg-gradient-to-b from-marble to-stone" />
      {/* Chapiteau */}
      <div
        className="h-3 w-9"
        style={{
          background: "linear-gradient(180deg, #d8d2c2 0%, #a39b87 100%)",
          clipPath: "polygon(0 0, 100% 0, 82% 100%, 18% 100%)",
        }}
      />
      {/* Fût cannelé */}
      <div
        className="w-7 flex-1"
        style={{
          background:
            "repeating-linear-gradient(90deg, #cfc8b6 0 3px, #8f8773 3px 5px, #b8b09c 5px 7px), linear-gradient(180deg, #d8d2c2, #9c947f)",
          backgroundBlendMode: "multiply",
        }}
      />
      {/* Base */}
      <div
        className="h-3 w-9"
        style={{
          background: "linear-gradient(180deg, #a39b87 0%, #d8d2c2 100%)",
          clipPath: "polygon(18% 0, 82% 0, 100% 100%, 0 100%)",
        }}
      />
      {/* Plinthe */}
      <div className="h-2 w-full bg-gradient-to-b from-stone to-marble" />
    </div>
  );
}
