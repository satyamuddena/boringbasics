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
