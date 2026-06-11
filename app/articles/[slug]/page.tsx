import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    return { title: "Article introuvable" };
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
    <article className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <time dateTime={post.created_at} className="text-sm text-mocha">
          {formatDate(post.created_at)}
        </time>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
          {post.title}
        </h1>
        {post.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image}
            alt=""
            className="mt-6 max-h-[480px] w-full rounded-xl object-cover"
          />
        )}
      </header>
      <div
        className="rich-text"
        dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
      />
    </article>
  );
}
