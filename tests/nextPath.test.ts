import assert from "node:assert/strict";
import test from "node:test";
import { loginUrlWithNext, safeNextPath } from "../src/lib/nextPath";

test("a normal admin destination survives", () => {
  assert.equal(safeNextPath("/admin/leads"), "/admin/leads");
});

test("the query string a notification deep-links with is preserved", () => {
  const target = "/admin/leads?tab=all&q=42";
  assert.equal(safeNextPath(target), target);
});

test("protocol-relative paths are rejected as open redirects", () => {
  // Browsers read these as absolute URLs to another host, so "starts with /"
  // is not a sufficient check.
  assert.equal(safeNextPath("//evil.example"), null);
  assert.equal(safeNextPath("/\\evil.example"), null);
});

test("absolute URLs to other origins are rejected", () => {
  assert.equal(safeNextPath("https://evil.example/admin/leads"), null);
  assert.equal(safeNextPath("http://evil.example"), null);
});

test("paths outside the admin area are rejected", () => {
  assert.equal(safeNextPath("/"), null);
  assert.equal(safeNextPath("/contact"), null);
  assert.equal(safeNextPath("/api/lead"), null);
  // A prefix-only match would let /adminevil through.
  assert.equal(safeNextPath("/adminevil"), null);
});

test("the login page itself is rejected so it cannot loop", () => {
  assert.equal(safeNextPath("/admin/login"), null);
  assert.equal(safeNextPath("/admin/login?next=/admin/leads"), null);
});

test("control characters are rejected", () => {
  const ch = (code: number) => String.fromCharCode(code);
  // A newline would let a crafted link break out into a second header.
  assert.equal(safeNextPath(`/admin/leads${ch(0x0a)}X-Injected: 1`), null);
  assert.equal(safeNextPath(`/admin/leads${ch(0x0d)}`), null);
  assert.equal(safeNextPath(`/admin/${ch(0x00)}leads`), null);
  assert.equal(safeNextPath(`/admin/leads${ch(0x7f)}`), null);
});

test("non-strings and empties are rejected", () => {
  assert.equal(safeNextPath(undefined), null);
  assert.equal(safeNextPath(null), null);
  assert.equal(safeNextPath(42), null);
  assert.equal(safeNextPath(""), null);
  assert.equal(safeNextPath("   "), null);
});

test("absurdly long paths are rejected", () => {
  assert.equal(safeNextPath(`/admin/leads?q=${"x".repeat(600)}`), null);
});

test("the login URL carries an encoded return path", () => {
  assert.equal(
    loginUrlWithNext("/admin/leads?tab=all&q=42"),
    "/admin/login?next=%2Fadmin%2Fleads%3Ftab%3Dall%26q%3D42",
  );
});

test("the login URL stays plain when there is nothing safe to return to", () => {
  assert.equal(loginUrlWithNext(null), "/admin/login");
  assert.equal(loginUrlWithNext("https://evil.example"), "/admin/login");
});
