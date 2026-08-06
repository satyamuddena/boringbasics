import assert from "node:assert/strict";
import test from "node:test";
import { slugify, uniqueSlug } from "../src/lib/forms";

test("slugify turns admin-typed titles into safe URL paths", () => {
  assert.equal(slugify("My First Post"), "my-first-post");
  assert.equal(slugify("  Leading & trailing  "), "leading-trailing");
  assert.equal(slugify("Protein: How Much?"), "protein-how-much");
  assert.equal(slugify("Fat-Loss 101 — The Basics"), "fat-loss-101-the-basics");
});

test("slugify never yields an empty or unsafe slug", () => {
  assert.equal(slugify(""), "item");
  assert.equal(slugify("!!!"), "item");
  assert.equal(slugify("---"), "item");
  assert.ok(slugify("a".repeat(200)).length <= 80);
});

test("uniqueSlug returns the plain slug when it is free", () => {
  assert.equal(uniqueSlug("My First Post", () => false), "my-first-post");
});

test("uniqueSlug suffixes rather than colliding with the UNIQUE constraint", () => {
  const taken = new Set(["my-first-post", "my-first-post-2"]);
  assert.equal(uniqueSlug("My First Post", (c) => taken.has(c)), "my-first-post-3");
});

test("uniqueSlug still resolves when everything is taken", () => {
  const slug = uniqueSlug("post", () => true);
  assert.ok(slug.startsWith("post-"));
  assert.ok(slug.length <= 80);
});
