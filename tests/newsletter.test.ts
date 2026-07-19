import assert from "node:assert/strict";
import test from "node:test";
import { renderNewsletterHtml, renderNewsletterText } from "../src/lib/newsletterTemplate";
import { isValidEmailAddress, parseNewsletterIntent, testNewsletterSubject } from "../src/lib/newsletterForm";

const branding = {
  siteUrl: "https://example.com",
  unsubscribeUrl: "https://example.com/unsubscribe?token=test-token",
  brand: "Example Fitness",
  tagline: "Train for life",
  logoPath: "/uploads/logo.png",
  accentColor: "#123456",
};

test("newsletter uses the notification logo without duplicate banner text", () => {
  const html = renderNewsletterHtml({ subject: "Weekly reset", html: "<p>Keep moving.</p>", cta: { label: "Read more", url: "https://example.com/blog/reset" } }, branding);
  assert.match(html, /https:\/\/example\.com\/uploads\/logo\.png/);
  assert.match(html, /alt="Example Fitness"/);
  assert.match(html, /width="320"/);
  assert.doesNotMatch(html, />BORING BASICS</);
  assert.doesNotMatch(html, /Train for life/);
  assert.match(html, /background:#123456/);
  assert.match(html, /Read more/);
  assert.match(html, /unsubscribe\?token=test-token/);
});

test("newsletter escapes plain text content and falls back to the default accent", () => {
  const html = renderNewsletterHtml({ subject: "A < B", paragraphs: ["Use <strong>carefully</strong>"] }, { ...branding, logoPath: undefined, accentColor: "invalid" });
  assert.match(html, /A &lt; B/);
  assert.match(html, /Use &lt;strong&gt;carefully&lt;\/strong&gt;/);
  assert.match(html, /color:#ff5722/);
  assert.match(html, /Example <span[^>]*>Fitness<\/span>/);
});

test("newsletter plain-text fallback keeps the brand, body, CTA, and unsubscribe URL", () => {
  const text = renderNewsletterText({ subject: "Weekly reset", html: "<p>Keep <strong>moving</strong>.</p>", cta: { label: "Read", url: "https://example.com/blog/reset" } }, branding);
  assert.match(text, /Example Fitness — Train for life/);
  assert.match(text, /Weekly reset/);
  assert.match(text, /Keep moving\./);
  assert.match(text, /Read: https:\/\/example\.com\/blog\/reset/);
  assert.match(text, /Unsubscribe: https:\/\/example\.com\/unsubscribe\?token=test-token/);
});

test("newsletter intent accepts only explicit test and broadcast actions", () => {
  assert.equal(parseNewsletterIntent("test"), "test");
  assert.equal(parseNewsletterIntent("broadcast"), "broadcast");
  assert.equal(parseNewsletterIntent("send"), null);
  assert.equal(parseNewsletterIntent(undefined), null);
});

test("test newsletter validates the recipient and prefixes the subject", () => {
  assert.equal(isValidEmailAddress("coach@example.com"), true);
  assert.equal(isValidEmailAddress("not-an-email"), false);
  assert.equal(isValidEmailAddress("a@b"), false);
  assert.equal(testNewsletterSubject("Weekly reset"), "[TEST] Weekly reset");
});
