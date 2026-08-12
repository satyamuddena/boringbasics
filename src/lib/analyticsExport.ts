type RawValue = string | number | boolean | null | undefined;

export function csvCell(value: RawValue) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function recordsToCsv<T extends Record<string, RawValue>>(
  rows: T[],
  columns: Array<keyof T>,
) {
  const header = columns.map((column) => csvCell(String(column))).join(",");
  const body = rows.map((row) => columns.map((column) => csvCell(row[column])).join(","));
  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
}
