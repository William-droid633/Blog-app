import Hero from "@/components/gallery/Hero";
import Marquee from "@/components/gallery/Marquee";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import Reveal from "@/components/gallery/Reveal";
import { createClient } from "@/lib/supabase-server";
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
    <>
      <Hero />
      <Marquee />

      <section id="exposition" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal>
          <div className="mb-16 flex flex-col gap-4 sm:mb-20">
            <p className="text-[11px] uppercase tracking-widecaps text-gold">
              Exposition permanente
            </p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-4xl font-semibold text-parchment sm:text-6xl">
                Les œuvres
              </h2>
              {posts && posts.length > 0 && (
                <p className="font-display text-lg italic text-parchment/40">
                  {posts.length} pièce{posts.length > 1 ? "s" : ""} accrochée
                  {posts.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="h-px w-full bg-gradient-to-r from-gold/50 via-parchment/10 to-transparent" />
          </div>
        </Reveal>

        {error ? (
          <p className="border border-parchment/10 bg-coal p-10 text-center text-parchment/60">
            La galerie est momentanément plongée dans le noir. Revenez dans un
            instant.
          </p>
        ) : !posts || posts.length === 0 ? (
          <Reveal>
            <div className="border border-parchment/10 bg-coal p-12 text-center sm:p-20">
              <p className="font-display text-3xl italic text-parchment/70">
                Le vernissage approche…
              </p>
              <p className="mt-4 text-sm text-parchment/40">
                Les premières œuvres seront bientôt accrochées. Revenez vite.
              </p>
            </div>
          </Reveal>
        ) : (
          <GalleryGrid posts={posts as Post[]} />
        )}
      </section>
    </>
  );
}
