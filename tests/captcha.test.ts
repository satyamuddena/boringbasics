import assert from "node:assert/strict";
import test from "node:test";
import { buildChallenge, checkChallenge, TTL_MS } from "../src/lib/captchaCore";

const SECRET = "test-secret";
const fresh = () => new Map<string, number>();

/** Pull the code back out of the SVG so a test can answer correctly. */
function solve(image: string): string {
  const svg = Buffer.from(image.split(",")[1], "base64").toString("utf8");
  return [...svg.matchAll(/<text[^>]*>([A-Z0-9])<\/text>/g)].map((m) => m[1]).join("");
}

test("a correct answer passes", () => {
  const c = buildChallenge(SECRET);
  assert.equal(checkChallenge(c.token, solve(c.image), SECRET, fresh()).ok, true);
});

test("case and surrounding space do not matter", () => {
  const c = buildChallenge(SECRET);
  const typed = `  ${solve(c.image).toLowerCase()} `;
  assert.equal(checkChallenge(c.token, typed, SECRET, fresh()).ok, true);
});

test("a wrong answer is refused", () => {
  const c = buildChallenge(SECRET);
  const wrong = solve(c.image) === "AAAAA" ? "BBBBB" : "AAAAA";
  const r = checkChallenge(c.token, wrong, SECRET, fresh());
  assert.equal(r.ok === false && r.reason, "wrong");
});

test("a solved token cannot be replayed", () => {
  const spent = fresh();
  const c = buildChallenge(SECRET);
  const answer = solve(c.image);
  assert.equal(checkChallenge(c.token, answer, SECRET, spent).ok, true);
  const second = checkChallenge(c.token, answer, SECRET, spent);
  assert.equal(second.ok === false && second.reason, "used");
});

test("an expired challenge is refused", () => {
  const c = buildChallenge(SECRET, Date.now() - TTL_MS - 1000);
  const r = checkChallenge(c.token, solve(c.image), SECRET, fresh());
  assert.equal(r.ok === false && r.reason, "expired");
});

test("a token signed with another key is refused", () => {
  const c = buildChallenge("someone-elses-key");
  const r = checkChallenge(c.token, solve(c.image), SECRET, fresh());
  assert.equal(r.ok === false && r.reason, "invalid");
});

test("swapping in an attacker's own answer hash is refused", () => {
  // The whole point of signing: the payload cannot be edited and re-attached.
  const c = buildChallenge(SECRET);
  const [payload, signature] = c.token.split(".");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  decoded.h = "0".repeat(64);
  const forged = Buffer.from(JSON.stringify(decoded)).toString("base64url");
  assert.equal(checkChallenge(`${forged}.${signature}`, "ANY", SECRET, fresh()).ok, false);
});

test("blank and missing input is refused", () => {
  const c = buildChallenge(SECRET);
  for (const answer of ["", "   ", undefined, null]) {
    assert.equal(checkChallenge(c.token, answer, SECRET, fresh()).ok, false);
  }
  assert.equal(checkChallenge("", "ABCDE", SECRET, fresh()).ok, false);
  assert.equal(checkChallenge("not-a-token", "ABCDE", SECRET, fresh()).ok, false);
});

test("the answer never travels to the browser in readable form", () => {
  const c = buildChallenge(SECRET);
  const answer = solve(c.image);
  assert.equal(c.token.includes(answer), false);
  const payload = Buffer.from(c.token.split(".")[0], "base64url").toString("utf8");
  assert.equal(payload.includes(answer), false);
});

test("challenges vary", () => {
  const codes = new Set(Array.from({ length: 30 }, () => solve(buildChallenge(SECRET).image)));
  assert.ok(codes.size > 20, `expected varied codes, got ${codes.size}`);
});

test("spent nonces are pruned once they expire", () => {
  const spent = new Map<string, number>([["old", Date.now() - 1000]]);
  const c = buildChallenge(SECRET);
  checkChallenge(c.token, solve(c.image), SECRET, spent);
  assert.equal(spent.has("old"), false);
});
