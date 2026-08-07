"use client";


import { useState } from "react";
import { AdminAlert, AdminCard, AdminHeading, btnPrimary } from "@/components/admin/ui";

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

      <div className="max-w-3xl space-y-4 sm:space-y-6">
        <AdminCard title="Export">
          <p className="mb-4 text-sm text-muted">
            Download all content tables (trainer profile, programs, testimonials, FAQs, socials,
            consultation &amp; site settings) as a single JSON file. User accounts, leads,
            subscribers and audit logs are <strong>not</strong> included.
          </p>
          <a href="/api/admin/sync/export" className={btnPrimary}>
            Download export
          </a>
        </AdminCard>

        <AdminCard title="Import">
          <p className="mb-4 text-sm text-muted">
            Upload a previously exported JSON file to replace all content tables. This overwrites
            every content row in the database with the data from the file.
          </p>

          <AdminAlert tone="warn">
            <strong>⚠ Destructive action</strong> — importing will delete and replace all existing
            content. Make sure you have a current export as a backup before proceeding.
          </AdminAlert>

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
              className={btnPrimary}
            >
              {status === "uploading" ? "Importing…" : "Upload & import"}
            </button>
          </div>

          {status === "success" && (
            <AdminAlert tone="ok" className="mt-4">
              Import complete — all content tables have been replaced.
            </AdminAlert>
          )}

          {status === "error" && (
            <AdminAlert tone="bad" className="mt-4">
              {errorMsg}
            </AdminAlert>
          )}
        </AdminCard>
      </div>
    </>
  );
}
