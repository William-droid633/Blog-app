/**
 * Extrait ~150 caractères de texte brut depuis le HTML d'un article.
 */
export function excerptFromHtml(html: string | null, maxLength = 150): string {
  if (!html) {
    return "";
  }

  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trimEnd() + "…";
}
