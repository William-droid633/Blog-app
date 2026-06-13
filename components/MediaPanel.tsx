"use client";

import { useRef, useState } from "react";
import { type Editor } from "@tiptap/react";
import { ImagePlus, Loader2, Youtube as YoutubeIcon } from "lucide-react";
import { compressImage } from "@/lib/compress-image";
import { uploadImage } from "@/lib/upload-image";

/**
 * Encadré d'insertion des médias du corps de l'article (images
 * supplémentaires et vidéos), distinct de la zone d'édition du texte.
 * Les éléments sont insérés à l'emplacement du curseur dans l'éditeur.
 */
export default function MediaPanel({ editor }: { editor: Editor | null }) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const url = await uploadImage(compressed, "content");
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      setError("L’envoi de l’image a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      setUploading(false);
    }
  };

  const insertYoutube = () => {
    const url = youtubeUrl.trim();
    if (!url || !editor) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
    setYoutubeUrl("");
  };

  const disabled = !editor;

  return (
    <div className="rounded-xl border border-latte bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-chestnut">Médias du corps de l’article</h3>
      <p className="mt-1 text-xs text-mocha">
        Images supplémentaires et vidéos, insérées là où se trouve le curseur dans le texte.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Image */}
        <div className="flex flex-col gap-2 rounded-lg border border-latte/80 bg-sand/30 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ImagePlus size={16} className="text-bark" />
            Image
          </span>
          <p className="text-xs text-mocha">Compressée automatiquement avant l’envoi.</p>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || uploading}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-bark px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-chestnut disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            {uploading ? "Envoi…" : "Insérer une image"}
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="hidden"
          />
        </div>

        {/* Vidéo */}
        <div className="flex flex-col gap-2 rounded-lg border border-latte/80 bg-sand/30 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <YoutubeIcon size={16} className="text-bark" />
            Vidéo YouTube
          </span>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                insertYoutube();
              }
            }}
            placeholder="https://www.youtube.com/watch?v=…"
            disabled={disabled}
            className="rounded-lg border border-latte bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-caramel disabled:opacity-50"
          />
          <button
            type="button"
            onClick={insertYoutube}
            disabled={disabled || !youtubeUrl.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-latte bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-sand disabled:opacity-50"
          >
            <YoutubeIcon size={16} />
            Insérer la vidéo
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
