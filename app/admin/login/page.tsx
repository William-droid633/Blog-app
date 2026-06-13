"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { SITE_NAME } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f4ece0] px-4 py-16 text-ink">
      <div className="w-full max-w-md">
        {/* En-tête de marque */}
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt=""
            className="h-16 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <h1 className="mt-4 font-display text-2xl font-bold text-chestnut">
            {SITE_NAME.toUpperCase()}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] uppercase tracking-widecaps text-mocha/70">
            <Lock size={11} />
            Espace d’administration
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-latte bg-white p-7 shadow-[0_24px_60px_-30px_rgba(62,47,35,0.4)] sm:p-8"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-mocha">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-latte bg-cream/40 px-4 py-3 text-ink outline-none transition-colors focus:border-caramel focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-mocha">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-latte bg-cream/40 px-4 py-3 text-ink outline-none transition-colors focus:border-caramel focus:bg-white"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-bark px-5 py-3 font-semibold text-cream shadow-sm transition-colors hover:bg-chestnut disabled:opacity-50"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Se connecter
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-mocha/70 transition-colors hover:text-bark"
          >
            <ArrowLeft size={14} />
            Retour au musée
          </Link>
        </div>
      </div>
    </div>
  );
}
