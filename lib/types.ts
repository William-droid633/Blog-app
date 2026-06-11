export interface Post {
  id: string;
  title: string;
  content: string | null;
  slug: string;
  cover_image: string | null;
  published: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
