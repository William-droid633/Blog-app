const WORDS = ["MVSEVM", "MEMORIA", "IMAGINES", "FABVLAE", "LVMEN"];

/** Bandeau défilant — inscriptions latines gravées dans la pierre. */
export default function Marquee() {
  const sequence = (
    <>
      {WORDS.map((word) => (
        <span key={word} className="mx-6 inline-flex items-center gap-12 sm:mx-10">
          <span className="font-display text-3xl font-semibold tracking-inscription text-parchment/12 sm:text-5xl">
            {word}
          </span>
          <span className="text-base text-gold/40" aria-hidden="true">
            ◆
          </span>
        </span>
      ))}
    </>
  );

  return (
    <div
      className="relative overflow-hidden border-y border-gold/15 bg-coal py-6"
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {sequence}
        {sequence}
      </div>
    </div>
  );
}
