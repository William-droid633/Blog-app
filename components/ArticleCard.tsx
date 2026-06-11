import Link from "next/link";
import { excerptFromHtml } from "@/lib/excerpt";
import { formatDate } from "@/lib/format-date";
import type { Post } from "@/lib/types";

export default function ArticleCard({ post }: { post: Post }) {
  const excerpt = excerptFromHtml(post.content);

  return (
    <Link
      href={`/articles/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-latte bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {post.cover_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image}
          alt=""
          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div
          className="h-48 w-full bg-gradient-to-br from-sand via-latte to-caramel/40"
          aria-hidden="true"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <time dateTime={post.created_at} className="text-sm text-mocha">
          {formatDate(post.created_at)}
        </time>
        <h2 className="font-display text-xl font-bold text-ink transition-colors group-hover:text-bark">
          {post.title}
        </h2>
        {excerpt && (
          <p className="text-sm leading-relaxed text-mocha">{excerpt}</p>
        )}
        <span className="mt-auto pt-2 text-sm font-semibold text-bark">
          Lire l’article →
        </span>
      </div>
    </Link>
  );
}
