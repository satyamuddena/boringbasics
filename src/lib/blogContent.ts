import { isRichTextHtml, sanitizeRichText } from "./richTextCore";

/** Preserves legacy Markdown while sanitizing content created by the rich-text editor. */
export function normalizeBlogBody(body: string): string {
  return isRichTextHtml(body) ? sanitizeRichText(body) : body;
}
