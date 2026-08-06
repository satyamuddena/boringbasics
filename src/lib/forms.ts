/** FormData → typed values for admin server actions. */

export const str = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();

export const num = (fd: FormData, key: string, fallback = 0): number => {
  const n = Number(String(fd.get(key) ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
};

export const optNum = (fd: FormData, key: string): number | null => {
  const raw = String(fd.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** Checkbox: present = true. */
export const bool = (fd: FormData, key: string): boolean => fd.get(key) != null;

/** Textarea with one item per line → JSON array string. */
export const lines = (fd: FormData, key: string): string =>
  JSON.stringify(
    String(fd.get(key) ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

/** Comma/space separated tags → JSON array string. */
export const csv = (fd: FormData, key: string): string =>
  JSON.stringify(
    String(fd.get(key) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";

/**
 * A slug that is free to use. Slugs are UNIQUE in the database, so without this
 * a repeated title raises a raw SQLite constraint error in the admin UI.
 * `isTaken` should exclude the row being edited.
 */
export const uniqueSlug = (base: string, isTaken: (candidate: string) => boolean): string => {
  const root = slugify(base);
  if (!isTaken(root)) return root;
  for (let n = 2; n <= 200; n++) {
    const candidate = `${root.slice(0, 76)}-${n}`;
    if (!isTaken(candidate)) return candidate;
  }
  return `${root.slice(0, 71)}-${Date.now().toString(36).slice(-6)}`;
};
