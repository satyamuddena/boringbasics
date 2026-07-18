"use client";


import { useState } from "react";
import { AdminCard, AdminHeading } from "@/components/admin/ui";

const btnClass =
  "inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep";

export default function SyncAdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleImport() {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/sync/import", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Import failed (${res.status})`);
      }
      setStatus("success");
      setFile(null);
      // Reset file input
      const input = document.getElementById("sync-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <>
      <AdminHeading title="Data Sync" />

      <div className="max-w-2xl space-y-6">
        <AdminCard title="Export">
          <p className="mb-4 text-sm text-muted">
            Download all content tables (trainer profile, programs, testimonials, FAQs, socials,
            consultation &amp; site settings) as a single JSON file. User accounts, leads,
            subscribers and audit logs are <strong>not</strong> included.
          </p>
          <a href="/api/admin/sync/export" className={btnClass}>
            Download export
          </a>
        </AdminCard>

        <AdminCard title="Import">
          <p className="mb-4 text-sm text-muted">
            Upload a previously exported JSON file to replace all content tables. This overwrites
            every content row in the database with the data from the file.
          </p>

          <div className="mb-4 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
            <strong>⚠ Destructive action</strong> — importing will delete and replace all existing
            content. Make sure you have a current export as a backup before proceeding.
          </div>

          <div className="space-y-4">
            <input
              id="sync-file-input"
              type="file"
              accept=".json"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setStatus("idle");
                setErrorMsg("");
              }}
              className="block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-ink-card file:px-4 file:py-2 file:text-sm file:font-semibold file:text-fg hover:file:bg-ink-soft"
            />

            <button
              type="button"
              onClick={handleImport}
              disabled={!file || status === "uploading"}
              className={`${btnClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {status === "uploading" ? "Importing…" : "Upload & import"}
            </button>
          </div>

          {status === "success" && (
            <p className="mt-4 rounded-lg border border-ok/40 bg-ok/10 px-4 py-2 text-sm text-ok">
              Import complete — all content tables have been replaced.
            </p>
          )}

          {status === "error" && (
            <p className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">
              {errorMsg}
            </p>
          )}
        </AdminCard>
      </div>
    </>
  );
}
