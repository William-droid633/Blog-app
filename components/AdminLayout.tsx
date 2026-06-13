"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { SITE_NAME } from "@/lib/config";

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shell de l'espace d'administration : barre supérieure fixe (marque +
 * accès au site + déconnexion), bandeau de titre, puis le contenu sur un
 * fond clair et chaleureux. L'en-tête et le pied de page publics sont
 * masqués sur ces pages.
 */
export default function AdminLayout({ title, subtitle, actions, children }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full bg-[#f4ece0] text-ink">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-40 border-b border-latte/80 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="group flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt=""
              className="h-9 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="flex flex-col leading-none">
              <span className="font-display text-sm font-bold tracking-wide text-chestnut">
                {SITE_NAME.toUpperCase()}
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-widecaps text-mocha/70">
                Administration
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-mocha transition-colors hover:bg-sand"
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">Voir le site</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-1.5 rounded-lg border border-latte bg-white px-3 py-2 text-sm font-semibold text-mocha transition-colors hover:bg-sand disabled:opacity-50"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bandeau de titre */}
      <div className="border-b border-latte/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3 px-4 py-7 sm:px-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-chestnut sm:text-[1.75rem]">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-mocha">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>

      {/* Contenu */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
