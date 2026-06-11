"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PostForm from "@/components/PostForm";
import { createClient } from "@/lib/supabase-browser";
import type { Post } from "@/lib/types";

export default function EditPostClient({ id }: { id: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (cancelled) {
        return;
      }
      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data as Post);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-chestnut">
          Article introuvable
        </h1>
        <p className="mt-3 text-mocha">
          Cet article n’existe pas ou a été supprimé.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-block rounded-lg bg-bark px-5 py-3 font-semibold text-cream transition-colors hover:bg-chestnut"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-mocha" size={28} />
      </div>
    );
  }

  return <PostForm initialPost={post} />;
}
