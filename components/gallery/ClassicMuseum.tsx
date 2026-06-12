"use client";

import Hero from "@/components/gallery/Hero";
import Marquee from "@/components/gallery/Marquee";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import Reveal from "@/components/gallery/Reveal";
import ColumnDecor from "@/components/roman/ColumnDecor";
import Meander from "@/components/roman/Meander";
import { toRoman } from "@/lib/roman";
import type { Post } from "@/lib/types";

/**
 * Version classique du musée (sans visite 3D) : servie aux navigateurs
 * sans WebGL, aux visiteurs préférant réduire les animations, ou sur
 * demande via le bouton de bascule.
 */
export default function ClassicMuseum({
  posts,
  loadError = false,
  onEnter3D,
}: {
  posts: Post[];
  loadError?: boolean;
  onEnter3D?: () => void;
}) {
  return (
    <>
      <Hero />
      <Marquee />

      <section id="atrium" className="relative">
        <div className="pointer-events-none absolute inset-y-10 left-4 hidden opacity-15 xl:block">
          <ColumnDecor className="h-full" />
        </div>
        <div className="pointer-events-none absolute inset-y-10 right-4 hidden opacity-15 xl:block">
          <ColumnDecor className="h-full" />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal>
            <div className="mb-16 flex flex-col gap-5 sm:mb-20">
              <p className="text-[11px] uppercase tracking-widecaps text-gold">
                Exposition permanente
              </p>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-display text-3xl font-bold tracking-inscription text-parchment sm:text-5xl">
                  LA COLLECTION
                </h2>
                {posts.length > 0 && (
                  <p className="font-accent text-xl italic text-parchment/40">
                    {toRoman(posts.length)} — {posts.length} pièce
                    {posts.length > 1 ? "s" : ""} exposée
                    {posts.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <Meander />
            </div>
          </Reveal>

          {loadError ? (
            <p className="border border-parchment/10 bg-coal p-10 text-center text-parchment/60">
              Le musée est momentanément plongé dans le noir. Revenez dans un
              instant.
            </p>
          ) : posts.length === 0 ? (
            <Reveal>
              <div className="border border-gold/15 bg-coal p-12 text-center sm:p-20">
                <p className="font-accent text-3xl italic text-parchment/70">
                  Le vernissage approche…
                </p>
                <p className="mt-4 text-sm text-parchment/40">
                  Les premières œuvres seront bientôt installées dans l’atrium.
                  Revenez vite.
                </p>
              </div>
            </Reveal>
          ) : (
            <GalleryGrid posts={posts} />
          )}
        </div>
      </section>

      {onEnter3D && (
        <button
          type="button"
          onClick={onEnter3D}
          className="fixed bottom-6 right-4 z-40 border border-gold/40 bg-night/80 px-5 py-3 text-[10px] uppercase tracking-widecaps text-gold backdrop-blur-sm transition-all duration-300 hover:bg-gold hover:text-night"
        >
          ✦ Visiter le musée en 3D
        </button>
      )}
    </>
  );
}
