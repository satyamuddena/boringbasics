import { AdminHeading } from "@/components/admin/ui";
import { PostForm } from "../PostForm";

export const dynamic = "force-dynamic";

export default function NewPostPage() {
  return (
    <>
      <AdminHeading title="New Post" />
      <PostForm />
    </>
  );
}
