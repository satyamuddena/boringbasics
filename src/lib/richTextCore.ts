import sanitizeHtml from "sanitize-html";

const allowedTags = ["p", "br", "h2", "h3", "strong", "em", "ul", "ol", "li", "blockquote", "hr", "a"];

/** Restrictive allowlist shared by blog posts and newsletters. */
export function sanitizeRichText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  }).trim();
}

export function isRichTextHtml(value: string): boolean {
  return /<\/?(?:p|br|h2|h3|strong|em|ul|ol|li|blockquote|hr|a)\b/i.test(value);
}

export function richTextToPlainText(value: string): string {
  return sanitizeHtml(sanitizeRichText(value), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
