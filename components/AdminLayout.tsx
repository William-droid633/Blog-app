"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

interface Props {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Layout commun aux pages admin : titre, actions, lien vers le site
 * et bouton de déconnexion.
 */
export default function AdminLayout({ title, actions, children }: Props) {
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
    <div className="w-full flex-1 bg-cream pb-12 pt-24 text-ink sm:pt-28">
      <div className="mx-auto max-w-5xl px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-chestnut sm:text-3xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Link
            href="/"
            className="rounded-lg border border-latte bg-white px-4 py-2.5 text-sm font-semibold text-mocha transition-colors hover:bg-sand"
          >
            Voir le site
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-lg border border-latte bg-white px-4 py-2.5 text-sm font-semibold text-mocha transition-colors hover:bg-sand disabled:opacity-50"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </div>
      {children}
      </div>
    </div>
  );
}
