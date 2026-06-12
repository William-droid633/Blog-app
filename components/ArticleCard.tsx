"use client";

import Link from "next/link";
import TiltCard from "@/components/gallery/TiltCard";
import { excerptFromHtml } from "@/lib/excerpt";
import { formatDate } from "@/lib/format-date";
import type { Post } from "@/lib/types";

/**
 * Un article présenté comme une œuvre : cadre doré, marie-louise,
 * cartel de musée (date, titre, extrait) sous le tableau.
 */
export default function ArticleCard({
  post,
  index = 0,
}: {
  post: Post;
  index?: number;
}) {
  const excerpt = excerptFromHtml(post.content, 140);

  return (
    <Link href={`/articles/${post.slug}`} className="group block outline-none">
      <TiltCard>
        {/* Lueur du projecteur au survol */}
        <div
          className="absolute -inset-6 -z-10 rounded-full opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,163,106,0.18), transparent)",
          }}
          aria-hidden="true"
        />

        {/* Moulure dorée */}
        <div
          className="p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] transition-shadow duration-500 group-hover:shadow-[0_35px_80px_-15px_rgba(201,163,106,0.25)]"
          style={{
            background:
              "linear-gradient(135deg, #6d5430 0%, #c9a36a 22%, #8a6a3c 50%, #e8cd9c 78%, #6d5430 100%)",
          }}
        >
          {/* Marie-louise */}
          <div className="bg-parchment p-3 sm:p-4">
            <div className="relative overflow-hidden bg-night">
              {post.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.cover_image}
                  alt=""
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                />
              ) : (
                <div
                  className="flex aspect-[4/3] w-full items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(420px 260px at 30% 20%, rgba(201,163,106,0.28), transparent 70%), linear-gradient(160deg, #2a221a 0%, #14100c 60%)",
                  }}
                >
                  <span className="font-display text-5xl italic text-gold/50">
                    {post.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Reflet de vitre */}
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 35%, rgba(243,236,221,0.10) 45%, transparent 55%)",
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </TiltCard>

      {/* Cartel d'exposition */}
      <div className="mt-5 border-l border-gold/40 pl-4">
        <p className="flex items-baseline gap-3 text-[10px] uppercase tracking-widecaps text-gold/80">
          <span>№ {String(index + 1).padStart(2, "0")}</span>
          <span className="text-parchment/35">
            <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
          </span>
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-snug text-parchment transition-colors duration-300 group-hover:text-goldlight sm:text-3xl">
          {post.title}
        </h2>
        {excerpt && (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-parchment/45">
            {excerpt}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-widecaps text-gold/0 transition-all duration-300 group-hover:gap-4 group-hover:text-gold">
          Contempler <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
