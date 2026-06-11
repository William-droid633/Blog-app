import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold text-chestnut">
        Page introuvable
      </h1>
      <p className="mt-3 text-mocha">
        Cette page n’existe pas ou n’est plus disponible.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-bark px-5 py-3 font-semibold text-cream transition-colors hover:bg-chestnut"
      >
        Retour à l’accueil
      </Link>
    </div>
  );
}
