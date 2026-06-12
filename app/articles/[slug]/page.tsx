import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReadingProgress from "@/components/gallery/ReadingProgress";
import Reveal from "@/components/gallery/Reveal";
import Meander from "@/components/roman/Meander";
import { createClient } from "@/lib/supabase-server";
import { excerptFromHtml } from "@/lib/excerpt";
import { formatDate } from "@/lib/format-date";
import type { Post } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

async function getPost(slug: string): Promise<Post | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  return (data as Post) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) {
    return { title: "Œuvre introuvable" };
  }
  return {
    title: post.title,
    description: excerptFromHtml(post.content),
  };
}

export default async function ArticlePage({ params }: Props) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="relative">
      <ReadingProgress />

      {/* La salle : l'œuvre en pleine lumière */}
      <header className="relative flex min-h-[72svh] items-end overflow-hidden">
        {post.cover_image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, #0c0a08 4%, rgba(12,10,8,0.55) 45%, rgba(12,10,8,0.35) 100%)",
              }}
              aria-hidden="true"
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 500px at 50% 0%, rgba(201,163,106,0.16), transparent 70%), linear-gradient(180deg, #14100c 0%, #0c0a08 100%)",
            }}
            aria-hidden="true"
          />
        )}
        {/* Vignettage */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(12,10,8,0.7) 100%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-16 pt-40 sm:px-6 sm:pb-20">
          <Reveal>
            <p className="text-[11px] uppercase tracking-widecaps text-gold">
              <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold leading-[1.15] tracking-wide text-parchment sm:text-5xl">
              {post.title}
            </h1>
            <div className="mt-8 flex flex-col gap-1.5">
              <span className="h-px w-40 bg-gradient-to-r from-gold to-transparent" />
              <span className="h-px w-40 bg-gradient-to-r from-gold/40 to-transparent" />
            </div>
          </Reveal>
        </div>
      </header>

      {/* Le cartel : contenu sur panneau papier, fidèle à l'éditeur */}
      <div className="mx-auto w-full max-w-4xl px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="article-paper overflow-hidden rounded-sm bg-cream shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] ring-1 ring-gold/25">
            <Meander className="text-bark/40" />
            <div className="p-6 sm:p-12 md:p-16">
              <div
                className="rich-text"
                dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
              />
            </div>
          </div>
        </Reveal>

        <div className="mt-14 flex justify-center">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 border border-gold/40 px-7 py-3.5 text-[11px] uppercase tracking-widecaps text-gold transition-all duration-300 hover:border-gold hover:bg-gold hover:text-night"
          >
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-1">
              ←
            </span>
            Retour au musée
          </Link>
        </div>
      </div>
    </article>
  );
}
