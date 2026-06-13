"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound } from "lucide-react";
import Meander from "@/components/roman/Meander";
import { SITE_NAME } from "@/lib/config";
import { toRoman } from "@/lib/roman";

/**
 * Pied de page public. Masqué dans l'espace d'administration (qui a sa
 * propre interface). Contient l'unique accès à l'administration, volontairement
 * discret : une petite clé en bas de page, toujours présente mais effacée.
 */
export default function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="relative border-t border-gold/20 bg-night">
      <Meander className="absolute -top-2 left-0 opacity-50" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 pb-10 pt-14 text-center">
        {/* Façade de temple stylisée */}
        <div className="flex h-14 items-end gap-5 opacity-35" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex h-full w-3 flex-col items-center">
              <div className="h-1 w-4 bg-stone" />
              <div
                className="w-2.5 flex-1"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, #cfc8b6 0 2px, #8f8773 2px 3px)",
                }}
              />
              <div className="h-1 w-4 bg-stone" />
            </div>
          ))}
        </div>
        <p className="font-display text-2xl font-semibold tracking-inscription text-parchment">
          {SITE_NAME.toUpperCase()}
        </p>
        <p className="text-[10px] uppercase tracking-widecaps text-gold/60">
          MVSEVM · PERSONALE
        </p>
        <p className="flex items-center gap-2 text-xs text-parchment/35">
          © {year} {SITE_NAME} · {toRoman(year)} · Tous droits réservés
          {/* Accès discret à l'administration */}
          <Link
            href="/admin"
            aria-label="Administration"
            title="Administration"
            className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-parchment/20 transition-colors hover:bg-white/5 hover:text-gold"
          >
            <KeyRound size={12} />
          </Link>
        </p>
      </div>
    </footer>
  );
}
