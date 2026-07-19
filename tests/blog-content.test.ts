import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBlogBody } from "../src/lib/blogContent";
import { isRichTextHtml, richTextToPlainText, sanitizeRichText } from "../src/lib/richTextCore";

test("rich text sanitizer preserves supported formatting and removes unsafe markup", () => {
  const html = sanitizeRichText('<h2>Plan</h2><p>Build <strong>habits</strong>.</p><script>alert(1)</script><a href="javascript:alert(1)">Bad link</a><a href="https://example.com">Good link</a>');
  assert.match(html, /<h2>Plan<\/h2>/);
  assert.match(html, /<strong>habits<\/strong>/);
  assert.doesNotMatch(html, /script|javascript:/i);
  assert.match(html, /https:\/\/example\.com/);
});

test("blog normalization sanitizes rich HTML while retaining legacy Markdown", () => {
  assert.equal(normalizeBlogBody("## Existing Markdown\n\n- item"), "## Existing Markdown\n\n- item");
  assert.equal(normalizeBlogBody("<p>Hello<script>alert(1)</script></p>"), "<p>Hello</p>");
});

test("rich-text detection and plain-text fallback work for blog and newsletter content", () => {
  assert.equal(isRichTextHtml("<ul><li>Item</li></ul>"), true);
  assert.equal(isRichTextHtml("## Markdown heading"), false);
  assert.equal(richTextToPlainText("<p>One <strong>two</strong>.</p>"), "One two.");
});
