import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminHeading } from "@/components/admin/ui";
import { ProgramForm } from "../ProgramForm";

export const dynamic = "force-dynamic";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = getDb().select().from(t.programs).where(eq(t.programs.id, Number(id))).get();
  if (!program) notFound();
  return (
    <>
      <AdminHeading title={`Edit: ${program.title}`} />
      <ProgramForm program={program} />
    </>
  );
}
