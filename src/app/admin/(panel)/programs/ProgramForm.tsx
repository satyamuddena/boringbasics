import type { schema } from "@/db";
import { goalLabels, type Goal } from "@/content/site";
import { AdminCard, Field, Input, Textarea, Select, Checkbox, SubmitButton } from "@/components/admin/ui";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { saveProgramAction } from "./actions";

type ProgramRow = typeof schema.programs.$inferSelect;

const json = <T,>(s: string | undefined, fb: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fb;
  } catch {
    return fb;
  }
};

export function ProgramForm({ program }: { program?: ProgramRow }) {
  const features = json<string[]>(program?.featuresJson, []);
  const goalTags = json<string[]>(program?.goalTagsJson, []);
  return (
    <form action={saveProgramAction} className="max-w-3xl space-y-6">
      {program && <input type="hidden" name="id" value={program.id} />}
      <AdminCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Input name="title" defaultValue={program?.title} required />
          </Field>
          <Field label="Slug" hint="URL path — leave empty to generate from the title.">
            <Input name="slug" defaultValue={program?.slug} />
          </Field>
          <Field label="Duration label" hint="e.g. 12 Weeks">
            <Input name="durationLabel" defaultValue={program?.durationLabel} required />
          </Field>
          <Field label="Display order">
            <Input name="displayOrder" type="number" defaultValue={program?.displayOrder ?? 0} />
          </Field>
          <Field label="Price (₹)" hint="Hidden on the site; shared during consultations.">
            <Input name="price" type="number" defaultValue={program?.price ?? 0} />
          </Field>
          <Field label="Billing period">
            <Select name="billingPeriod" defaultValue={program?.billingPeriod ?? "one-time"}>
              <option value="one-time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4 space-y-4">
          <Field label="Short description">
            <Textarea name="shortDescription" defaultValue={program?.shortDescription} required />
          </Field>
          <Field label="Full description">
            <Textarea name="fullDescription" rows={5} defaultValue={program?.fullDescription} />
          </Field>
          <Field label="Features" hint="One per line.">
            <Textarea name="features" rows={5} defaultValue={features.join("\n")} />
          </Field>
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Goal tags
            </span>
            <div className="flex flex-wrap gap-4">
              {(Object.keys(goalLabels) as Goal[]).map((g) => (
                <Checkbox
                  key={g}
                  name="goalTags"
                  value={g}
                  label={goalLabels[g]}
                  defaultChecked={goalTags.includes(g)}
                />
              ))}
            </div>
          </div>
          <Checkbox name="popular" label="Mark as most popular" defaultChecked={program?.popular} />
          <ImageUploadField name="image" label="Card image" kind="program" defaultValue={program?.image ?? ""} />
        </div>
      </AdminCard>
      <SubmitButton>{program ? "Save program" : "Create program"}</SubmitButton>
    </form>
  );
}
