import EditPostClient from "./EditPostClient";

export const runtime = "edge";

export default function EditPostPage({ params }: { params: { id: string } }) {
  return <EditPostClient id={params.id} />;
}
