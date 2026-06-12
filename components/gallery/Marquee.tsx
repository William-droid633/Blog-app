import { SITE_NAME } from "@/lib/config";

const WORDS = [SITE_NAME, "Récits", "Images", "Réflexions", "Souvenirs"];

/** Bandeau défilant entre le hero et l'exposition. */
export default function Marquee() {
  const sequence = (
    <>
      {WORDS.map((word) => (
        <span key={word} className="mx-6 inline-flex items-center gap-12 sm:mx-10">
          <span className="font-display text-3xl font-semibold italic text-parchment/15 sm:text-5xl">
            {word}
          </span>
          <span className="text-gold/40" aria-hidden="true">
            ✦
          </span>
        </span>
      ))}
    </>
  );

  return (
    <div
      className="relative overflow-hidden border-y border-parchment/10 bg-coal py-6"
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {sequence}
        {sequence}
      </div>
    </div>
  );
}
