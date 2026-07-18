import { AdminHeading } from "@/components/admin/ui";
import { ProgramForm } from "../ProgramForm";

export const dynamic = "force-dynamic";

export default function NewProgramPage() {
  return (
    <>
      <AdminHeading title="New Program" />
      <ProgramForm />
    </>
  );
}
