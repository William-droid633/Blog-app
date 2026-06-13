"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { createClient } from "@/lib/supabase-browser";
import { formatDate } from "@/lib/format-date";
import type { Post } from "@/lib/types";

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError("Impossible de charger les articles. Rechargez la page.");
      return;
    }
    setError(null);
    setPosts((data as Post[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const togglePublish = async (post: Post) => {
    setBusyId(post.id);
    const { error: updateError } = await supabase
      .from("posts")
      .update({ published: !post.published })
      .eq("id", post.id);
    if (updateError) {
      setError("La mise à jour a échoué. Réessayez.");
    } else {
      setPosts(
        (current) =>
          current?.map((p) =>
            p.id === post.id ? { ...p, published: !p.published } : p
          ) ?? null
      );
    }
    setBusyId(null);
  };

  const deletePost = async (post: Post) => {
    const confirmed = window.confirm(
      `Supprimer « ${post.title} » ?\n\nCette action est définitive.`
    );
    if (!confirmed) {
      return;
    }
    setBusyId(post.id);
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id);
    if (deleteError) {
      setError("La suppression a échoué. Réessayez.");
    } else {
      setPosts((current) => current?.filter((p) => p.id !== post.id) ?? null);
    }
    setBusyId(null);
  };

  const subtitle =
    posts === null
      ? "Chargement…"
      : posts.length === 0
        ? "Aucun article pour l’instant"
        : `${posts.length} article${posts.length > 1 ? "s" : ""} · ${
            posts.filter((p) => p.published).length
          } publié${posts.filter((p) => p.published).length > 1 ? "s" : ""}`;

  return (
    <AdminLayout
      title="Tableau de bord"
      subtitle={subtitle}
      actions={
        <Link
          href="/admin/nouveau"
          className="flex items-center gap-2 rounded-lg bg-bark px-4 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-chestnut"
        >
          <Plus size={16} />
          Nouvel article
        </Link>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {posts === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-mocha" size={28} />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-latte bg-white p-10 text-center">
          <p className="text-mocha">
            Aucun article pour l’instant. Lancez-vous !
          </p>
          <Link
            href="/admin/nouveau"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-bark px-5 py-3 font-semibold text-cream transition-colors hover:bg-chestnut"
          >
            <Plus size={18} />
            Écrire mon premier article
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-col gap-3 rounded-xl border border-latte bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"
            >
              {post.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.cover_image}
                  alt=""
                  className="h-20 w-full rounded-lg object-cover sm:w-28"
                />
              ) : (
                <div
                  className="h-20 w-full rounded-lg bg-gradient-to-br from-sand to-latte sm:w-28"
                  aria-hidden="true"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-ink">
                    {post.title}
                  </h2>
                  {post.published ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      Publié
                    </span>
                  ) : (
                    <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-mocha">
                      Brouillon
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-mocha">
                  Créé le {formatDate(post.created_at)} · Modifié le{" "}
                  {formatDate(post.updated_at)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {post.published && (
                  <Link
                    href={`/articles/${post.slug}`}
                    className="rounded-lg border border-latte px-3 py-2.5 text-sm font-semibold text-mocha transition-colors hover:bg-sand"
                  >
                    Voir
                  </Link>
                )}
                <Link
                  href={`/admin/modifier/${post.id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-latte px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-sand"
                >
                  <Pencil size={14} />
                  Modifier
                </Link>
                <button
                  type="button"
                  onClick={() => togglePublish(post)}
                  disabled={busyId === post.id}
                  className="rounded-lg border border-latte px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-sand disabled:opacity-50"
                >
                  {post.published ? "Dépublier" : "Publier"}
                </button>
                <button
                  type="button"
                  onClick={() => deletePost(post)}
                  disabled={busyId === post.id}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
