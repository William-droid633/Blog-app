"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { compressImage } from "@/lib/compress-image";
import { uploadImage } from "@/lib/upload-image";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

/**
 * Upload d'image de couverture : compression automatique invisible,
 * loader affiché seulement si le traitement dépasse 1 seconde,
 * prévisualisation immédiate après envoi.
 */
export default function ImageUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setBusy(true);
    setError(null);
    // Le loader n'apparaît que si la compression + l'envoi durent plus d'1 s
    const loaderTimer = setTimeout(() => setShowLoader(true), 1000);

    try {
      const compressed = await compressImage(file);
      const url = await uploadImage(compressed, "covers");
      onChange(url);
    } catch {
      setError("L’envoi de l’image a échoué. Réessayez.");
    } finally {
      clearTimeout(loaderTimer);
      setShowLoader(false);
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-latte">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Image de couverture"
            className="max-h-72 w-full object-cover"
          />
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow transition-colors hover:bg-white"
            >
              {busy && showLoader ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Changer"
              )}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              aria-label="Retirer l’image de couverture"
              className="rounded-lg bg-white/90 p-2 text-red-700 shadow transition-colors hover:bg-white"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-latte bg-white text-mocha transition-colors hover:border-caramel hover:text-bark"
        >
          {busy && showLoader ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Préparation de l’image…</span>
            </>
          ) : (
            <>
              <ImagePlus size={24} />
              <span className="text-sm font-semibold">
                Choisir une image de couverture
              </span>
              <span className="text-xs">
                La photo est compressée automatiquement
              </span>
            </>
          )}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
