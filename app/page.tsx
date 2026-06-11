import ArticleCard from "@/components/ArticleCard";
import { createClient } from "@/lib/supabase-server";
import { SITE_NAME } from "@/lib/config";
import type { Post } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <section className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-chestnut sm:text-4xl">
          Bienvenue sur {SITE_NAME}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-mocha">
          Articles, photos et réflexions, publiés au fil du temps.
        </p>
      </section>

      {error ? (
        <p className="rounded-xl border border-latte bg-white p-8 text-center text-mocha">
          Impossible de charger les articles pour le moment. Réessayez dans un
          instant.
        </p>
      ) : !posts || posts.length === 0 ? (
        <p className="rounded-xl border border-latte bg-white p-8 text-center text-mocha">
          Aucun article publié pour l’instant. Revenez bientôt !
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(posts as Post[]).map((post) => (
            <ArticleCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
