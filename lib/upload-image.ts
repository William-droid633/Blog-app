import { createClient } from "@/lib/supabase-browser";

/**
 * Envoie un fichier image dans le bucket public `images` de Supabase Storage
 * et renvoie son URL publique.
 */
export async function uploadImage(
  file: File,
  folder: "covers" | "content"
): Promise<string> {
  const supabase = createClient();

  const extension = file.type === "image/webp"
    ? "webp"
    : file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  const { error } = await supabase.storage.from("images").upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });

  if (error) {
    throw error;
  }

  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}
