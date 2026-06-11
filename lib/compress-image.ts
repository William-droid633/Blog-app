import imageCompression from "browser-image-compression";

const SKIP_THRESHOLD = 200 * 1024; // moins de 200 KB : on ne recompresse pas

/**
 * Compresse une image avant envoi vers Supabase Storage.
 * Invisible pour l'utilisateur : il choisit un fichier, il voit sa photo.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.size < SKIP_THRESHOLD) {
    return file;
  }

  const options = {
    maxSizeMB: 0.8, // maximum 800 KB
    maxWidthOrHeight: 1920, // résolution max full-HD
    useWebWorker: true, // compression en arrière-plan, ne bloque pas l'UI
    fileType: "image/webp", // WebP : meilleure compression à qualité égale
    initialQuality: 0.85, // excellent compromis beauté/poids
  };

  return imageCompression(file, options);
}
