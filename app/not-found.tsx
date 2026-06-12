import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-32 text-center">
      <p className="text-[11px] uppercase tracking-widecaps text-gold">
        Salle condamnée
      </p>
      <h1 className="mt-4 font-display text-6xl font-bold tracking-inscription text-parchment sm:text-8xl">
        CDIV
      </h1>
      <p className="mt-2 text-xs uppercase tracking-widecaps text-parchment/30">
        Erreur 404
      </p>
      <p className="mt-6 max-w-sm font-accent text-xl italic text-parchment/50">
        Cette salle du musée n’existe pas, ou l’œuvre a été rendue à Rome.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-3 border border-gold/40 px-7 py-3.5 text-[11px] uppercase tracking-widecaps text-gold transition-all duration-300 hover:border-gold hover:bg-gold hover:text-night"
      >
        Retour au musée
      </Link>
    </div>
  );
}
