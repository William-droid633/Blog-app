import MuseumExperience from "@/components/museum/MuseumExperience";
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

  const publishedPosts = (posts as Post[] | null) ?? [];

  return (
    <>
      {/* Liste accessible et indexable des œuvres exposées */}
      <nav className="sr-only" aria-label="Articles publiés">
        <ul>
          {publishedPosts.map((post) => (
            <li key={post.id}>
              <a href={`/articles/${post.slug}`}>{post.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <MuseumExperience posts={publishedPosts} loadError={Boolean(error)} />
    </>
  );
}
