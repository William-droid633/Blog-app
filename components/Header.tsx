import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-latte bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex min-h-11 items-center gap-3">
          {/* Logo fourni par le propriétaire du site — placer le fichier
              dans /public/logo.svg, ne jamais le remplacer par un autre visuel */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt={`Logo ${SITE_NAME}`} className="h-10 w-auto" />
          <span className="font-display text-2xl font-bold text-chestnut">
            {SITE_NAME}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold text-mocha">
          <Link
            href="/"
            className="rounded-lg px-3 py-2.5 transition-colors hover:bg-sand hover:text-chestnut"
          >
            Accueil
          </Link>
          <Link
            href="/admin"
            className="rounded-lg px-3 py-2.5 transition-colors hover:bg-sand hover:text-chestnut"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
