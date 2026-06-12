"use client";

import Link from "next/link";
import TiltCard from "@/components/gallery/TiltCard";
import { excerptFromHtml } from "@/lib/excerpt";
import { formatDate } from "@/lib/format-date";
import { toRoman } from "@/lib/roman";
import type { Post } from "@/lib/types";

/**
 * Un article présenté comme une œuvre dans une niche de temple :
 * arc en plein cintre, encadrement de marbre, liseré de bronze,
 * cartel de musée numéroté en chiffres romains.
 */
export default function ArticleCard({
  post,
  index = 0,
}: {
  post: Post;
  index?: number;
}) {
  const excerpt = excerptFromHtml(post.content, 130);

  return (
    <Link href={`/articles/${post.slug}`} className="group block outline-none">
      <TiltCard>
        {/* Lueur de torche au survol */}
        <div
          className="absolute -inset-6 -z-10 rounded-full opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,163,106,0.20), transparent)",
          }}
          aria-hidden="true"
        />

        {/* Encadrement de marbre en arc */}
        <div
          className="rounded-t-full p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] transition-shadow duration-500 group-hover:shadow-[0_35px_80px_-15px_rgba(201,163,106,0.3)] sm:p-3"
          style={{
            background:
              "linear-gradient(160deg, #ece6d6 0%, #b8b09c 30%, #e8e2d2 55%, #9c947f 85%, #d8d2c2 100%)",
          }}
        >
          {/* Liseré de bronze */}
          <div className="rounded-t-full bg-night p-1 ring-1 ring-bronze/60">
            <div className="relative overflow-hidden rounded-t-full">
              {post.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.cover_image}
                  alt=""
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                />
              ) : (
                <div
                  className="flex aspect-[3/4] w-full items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(360px 300px at 50% 18%, rgba(201,163,106,0.30), transparent 70%), linear-gradient(170deg, #2a221a 0%, #14100c 60%)",
                  }}
                >
                  <span className="font-display text-6xl font-semibold text-gold/50">
                    {post.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Lumière tombant du haut de la niche */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(70% 45% at 50% 0%, rgba(232,205,156,0.18), transparent 70%), linear-gradient(to top, rgba(12,10,8,0.35), transparent 35%)",
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </TiltCard>

      {/* Cartel d'exposition */}
      <div className="mt-5 border-l border-gold/40 pl-4">
        <p className="flex flex-wrap items-baseline gap-x-3 text-[10px] uppercase tracking-widecaps text-gold/80">
          <span>Œuvre {toRoman(index + 1)}</span>
          <span className="text-parchment/35">
            <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
          </span>
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold leading-snug text-parchment transition-colors duration-300 group-hover:text-goldlight sm:text-2xl">
          {post.title}
        </h2>
        {excerpt && (
          <p className="mt-2 max-w-prose font-serif text-sm leading-relaxed text-parchment/45">
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
