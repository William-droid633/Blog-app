import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-32 text-center">
      <p className="text-[11px] uppercase tracking-widecaps text-gold">
        Salle introuvable
      </p>
      <h1 className="mt-4 font-display text-5xl font-semibold text-parchment sm:text-7xl">
        404
      </h1>
      <p className="mt-4 max-w-sm font-display text-lg italic text-parchment/50">
        Cette salle de la galerie n’existe pas, ou l’œuvre a été décrochée.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-3 border border-gold/40 px-7 py-3.5 text-[11px] uppercase tracking-widecaps text-gold transition-all duration-300 hover:border-gold hover:bg-gold hover:text-night"
      >
        Retour à la galerie
      </Link>
    </div>
  );
}
