"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import ImageUpload from "@/components/ImageUpload";
import TiptapEditor from "@/components/TiptapEditor";
import { createClient } from "@/lib/supabase-browser";
import { slugify } from "@/lib/slugify";
import type { Post } from "@/lib/types";

const AUTOSAVE_INTERVAL_MS = 30_000;

type SaveMode = "auto" | "draft" | "publish";

interface Props {
  initialPost?: Post;
}

export default function PostForm({ initialPost }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [postId, setPostId] = useState<string | null>(initialPost?.id ?? null);
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [content, setContent] = useState(initialPost?.content ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(
    initialPost?.cover_image ?? null
  );
  const [notes, setNotes] = useState(initialPost?.notes ?? "");
  const [published, setPublished] = useState(initialPost?.published ?? false);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Les refs permettent à l'auto-save de lire l'état le plus récent
  // sans recréer l'intervalle à chaque frappe.
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const latestRef = useRef({ postId, title, content, coverImage, notes, published });
  latestRef.current = { postId, title, content, coverImage, notes, published };

  const markDirty = () => {
    dirtyRef.current = true;
  };

  const ensureUniqueSlug = useCallback(
    async (fromTitle: string): Promise<string> => {
      const base = slugify(fromTitle) || "article";
      let candidate = base;
      let suffix = 2;
      for (;;) {
        const { data, error: slugError } = await supabase
          .from("posts")
          .select("id")
          .eq("slug", candidate)
          .limit(1);
        if (slugError) {
          throw slugError;
        }
        if (!data || data.length === 0) {
          return candidate;
        }
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
    },
    [supabase]
  );

  const savePost = useCallback(
    async (mode: SaveMode): Promise<boolean> => {
      if (savingRef.current) {
        return false;
      }
      const current = latestRef.current;

      if (!current.title.trim()) {
        if (mode !== "auto") {
          setError("Ajoutez un titre avant d’enregistrer.");
        }
        return false;
      }

      savingRef.current = true;
      setSaving(true);
      setError(null);

      try {
        const nextPublished =
          mode === "publish" ? true : mode === "draft" ? false : current.published;

        const fields = {
          title: current.title.trim(),
          content: current.content,
          cover_image: current.coverImage,
          notes: current.notes,
          published: nextPublished,
        };

        if (!current.postId) {
          // Premier enregistrement : on génère le slug une seule fois,
          // il restera stable même si le titre change ensuite.
          const slug = await ensureUniqueSlug(current.title);
          const { data, error: insertError } = await supabase
            .from("posts")
            .insert({ ...fields, slug })
            .select("id")
            .single();
          if (insertError) {
            throw insertError;
          }
          setPostId(data.id);
          // Permet de recharger la page sans créer de doublon
          window.history.replaceState(null, "", `/admin/modifier/${data.id}`);
        } else {
          const { error: updateError } = await supabase
            .from("posts")
            .update(fields)
            .eq("id", current.postId);
          if (updateError) {
            throw updateError;
          }
        }

        setPublished(nextPublished);
        dirtyRef.current = false;
        setSavedAt(
          new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        return true;
      } catch {
        setError("L’enregistrement a échoué. Vérifiez votre connexion.");
        return false;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [ensureUniqueSlug, supabase]
  );

  // Auto-save silencieux toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current && !savingRef.current) {
        savePost("auto");
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [savePost]);

  const handleSaveDraft = async () => {
    await savePost("draft");
  };

  const handlePublish = async () => {
    const ok = await savePost("publish");
    if (ok) {
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <AdminLayout
      title={initialPost ? "Modifier l’article" : "Nouvel article"}
      actions={
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-lg border border-latte bg-white px-4 py-2.5 text-sm font-semibold text-mocha transition-colors hover:bg-sand"
        >
          <ArrowLeft size={16} />
          Tableau de bord
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Barre d'état + actions principales */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-latte bg-white p-3 sm:p-4">
          <div className="text-sm text-mocha">
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Enregistrement…
              </span>
            ) : savedAt ? (
              <span>Enregistré à {savedAt}</span>
            ) : (
              <span>Pas encore enregistré</span>
            )}
            {published && (
              <span className="ml-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                Publié
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="rounded-lg border border-latte bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-sand disabled:opacity-50"
            >
              Enregistrer en brouillon
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="rounded-lg bg-bark px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-chestnut disabled:opacity-50"
            >
              Publier
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {/* Titre */}
        <div>
          <label
            htmlFor="post-title"
            className="mb-1.5 block text-sm font-semibold text-mocha"
          >
            Titre
          </label>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            placeholder="Le titre de votre article"
            className="w-full rounded-xl border border-latte bg-white px-4 py-3 font-display text-xl font-bold text-ink outline-none transition-colors placeholder:font-body placeholder:text-base placeholder:font-normal placeholder:text-mocha/50 focus:border-caramel"
          />
        </div>

        {/* Image de couverture */}
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-mocha">
            Image de couverture
          </span>
          <ImageUpload
            value={coverImage}
            onChange={(url) => {
              setCoverImage(url);
              markDirty();
            }}
          />
        </div>

        {/* Contenu */}
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-mocha">
            Contenu de l’article
          </span>
          <TiptapEditor
            content={content ?? ""}
            onChange={(html) => {
              setContent(html);
              markDirty();
            }}
          />
        </div>

        {/* Notes privées */}
        <div>
          <label
            htmlFor="post-notes"
            className="mb-1.5 block text-sm font-semibold text-mocha"
          >
            Notes libres{" "}
            <span className="font-normal">
              — privées, jamais visibles sur le site
            </span>
          </label>
          <textarea
            id="post-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              markDirty();
            }}
            rows={5}
            placeholder="Vos idées, rappels et brouillons mentaux pour cet article…"
            className="w-full rounded-xl border border-latte bg-sand/40 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-mocha/50 focus:border-caramel"
          />
        </div>
      </div>
    </AdminLayout>
  );
}
