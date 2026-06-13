import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReadingProgress from "@/components/gallery/ReadingProgress";
import Reveal from "@/components/gallery/Reveal";
import ArticleContent from "@/components/gallery/ArticleContent";
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
    <article className="article-read relative min-h-screen pb-12">
      <ReadingProgress />

      {/* Bandeau : l'image de couverture qui se fond dans la page claire */}
      <header className="relative">
        {post.cover_image ? (
          <div className="relative h-[52svh] min-h-[300px] w-full overflow-hidden sm:h-[60svh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image}
              alt=""
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(26,19,12,0.28) 0%, rgba(26,19,12,0) 32%, rgba(246,239,226,0) 64%, #f6efe2 100%)",
              }}
              aria-hidden="true"
            />
          </div>
        ) : (
          <div
            className="h-[30svh] min-h-[180px] w-full"
            style={{
              background:
                "radial-gradient(700px 320px at 50% 0%, rgba(201,138,75,0.22), transparent 70%), #f6efe2",
            }}
            aria-hidden="true"
          />
        )}

        {/* Titre posé sur la page, à cheval sur le bas du bandeau */}
        <div className="relative z-10 mx-auto -mt-20 w-full max-w-[46rem] px-5 sm:-mt-28">
          <Reveal>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-widecaps text-[#a65f2a]">
                <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
              </p>
              <h1 className="mt-4 font-accent text-[2.1rem] font-bold leading-[1.08] text-[#2a2017] sm:text-6xl">
                {post.title}
              </h1>
              <div className="mx-auto mt-7 h-px w-24 bg-gradient-to-r from-transparent via-[#c98a4b] to-transparent" />
            </div>
          </Reveal>
        </div>
      </header>

      {/* Corps de l'article : colonne de lecture spacieuse */}
      <div className="mx-auto w-full max-w-[46rem] px-5 pb-10 pt-12 sm:pt-16">
        <ArticleContent html={post.content ?? ""} />

        <div className="mt-20 flex justify-center">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 rounded-full border border-[#c98a4b]/50 px-7 py-3.5 text-[11px] uppercase tracking-widecaps text-[#a65f2a] transition-all duration-300 hover:border-[#c98a4b] hover:bg-[#c98a4b] hover:text-[#f6efe2]"
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
