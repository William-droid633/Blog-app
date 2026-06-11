"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
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
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <h1 className="text-center font-display text-2xl font-bold text-chestnut sm:text-3xl">
        Administration de {SITE_NAME}
      </h1>
      <p className="mt-2 text-center text-sm text-mocha">
        Connectez-vous pour gérer vos articles.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 flex flex-col gap-4 rounded-xl border border-latte bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-semibold text-mocha"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-latte bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-caramel"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-semibold text-mocha"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-latte bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-caramel"
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
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-bark px-5 py-3 font-semibold text-cream transition-colors hover:bg-chestnut disabled:opacity-50"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Se connecter
        </button>
      </form>
    </div>
  );
}
