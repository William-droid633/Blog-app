"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE_NAME } from "@/lib/config";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // L'espace d'administration possède sa propre barre : on masque l'en-tête
  // public sur toutes ses pages.
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-gold/15 bg-night/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex min-h-11 items-center gap-3">
          {/* Logo fourni par le propriétaire du site — placer le fichier
              dans /public/logo.svg, ne jamais le remplacer par un autre visuel.
              Tant que le fichier est absent, l'image se masque proprement. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt={`Logo ${SITE_NAME}`}
            className="site-logo h-12 w-auto sm:h-14"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="site-wordmark font-display text-xl font-semibold tracking-inscription text-parchment transition-colors group-hover:text-goldlight sm:text-2xl">
            {SITE_NAME.toUpperCase()}
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widecaps">
          <Link
            href="/"
            className="relative px-3 py-2.5 text-parchment/60 transition-colors after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 hover:text-goldlight hover:after:scale-x-100"
          >
            Musée
          </Link>
        </nav>
      </div>
    </header>
  );
}
