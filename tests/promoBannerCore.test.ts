import assert from "node:assert/strict";
import test from "node:test";
import {
  promoStatus,
  isPromoActive,
  istInputToIso,
  isoToIstInput,
  defaultPromoHref,
  isPromoKind,
  toPromoEffect,
  PROMO_EFFECTS,
} from "../src/lib/promoBannerCore";

const NOW = new Date("2026-08-15T12:00:00.000Z");
const on = { isEnabled: true, startsAt: null, endsAt: null };

test("an enabled promo with no dates runs until switched off", () => {
  assert.equal(promoStatus(on, NOW), "active");
  assert.equal(isPromoActive(on, NOW), true);
});

test("the manual override beats the schedule", () => {
  // Squarely inside its window, but switched off.
  const row = { isEnabled: false, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-08-31T00:00:00.000Z" };
  assert.equal(promoStatus(row, NOW), "off");
  assert.equal(isPromoActive(row, NOW), false);
});

test("a promo is scheduled before its start and expired after its end", () => {
  assert.equal(promoStatus({ ...on, startsAt: "2026-09-01T00:00:00.000Z" }, NOW), "scheduled");
  assert.equal(promoStatus({ ...on, endsAt: "2026-08-01T00:00:00.000Z" }, NOW), "expired");
});

test("an open-ended bound only constrains its own side", () => {
  assert.equal(promoStatus({ ...on, startsAt: "2026-08-01T00:00:00.000Z" }, NOW), "active");
  assert.equal(promoStatus({ ...on, endsAt: "2026-08-31T00:00:00.000Z" }, NOW), "active");
});

test("the window is inclusive of its exact boundaries", () => {
  const startsNow = { ...on, startsAt: NOW.toISOString() };
  const endsNow = { ...on, endsAt: NOW.toISOString() };
  assert.equal(promoStatus(startsNow, NOW), "active");
  assert.equal(promoStatus(endsNow, NOW), "active");
});

test("an unparseable date fails open rather than hiding the promo", () => {
  assert.equal(promoStatus({ ...on, startsAt: "not a date" }, NOW), "active");
  assert.equal(promoStatus({ ...on, endsAt: "" }, NOW), "active");
});

test("admin-typed IST wall-clock is stored as the matching UTC instant", () => {
  // 1 Aug 2026 00:00 IST is 31 Jul 2026 18:30 UTC.
  assert.equal(istInputToIso("2026-08-01T00:00"), "2026-07-31T18:30:00.000Z");
  assert.equal(istInputToIso("2026-08-31T23:59"), "2026-08-31T18:29:00.000Z");
});

test("stored UTC round-trips back to the same IST wall-clock", () => {
  for (const local of ["2026-08-01T00:00", "2026-12-31T23:59", "2026-06-15T09:30"]) {
    assert.equal(isoToIstInput(istInputToIso(local)), local);
  }
});

test("blank and malformed schedule inputs become null, not Invalid Date", () => {
  assert.equal(istInputToIso(""), null);
  assert.equal(istInputToIso("   "), null);
  assert.equal(istInputToIso(null), null);
  assert.equal(istInputToIso("31-08-2026"), null);
  assert.equal(isoToIstInput(null), "");
  assert.equal(isoToIstInput("nonsense"), "");
});

test("a blank CTA link falls back to the promoted item's own page", () => {
  assert.equal(defaultPromoHref("post", "festive-sale"), "/blog/festive-sale");
  assert.equal(defaultPromoHref("program", "12-week"), "/programs/12-week");
  // Testimonials have no individual permalink.
  assert.equal(defaultPromoHref("testimonial", null), "/testimonials");
  // A missing slug must not produce "/blog/null".
  assert.equal(defaultPromoHref("post", null), "/blog");
});

test("only the three known kinds are accepted", () => {
  assert.equal(isPromoKind("program"), true);
  assert.equal(isPromoKind("lead"), false);
});

test("the two animated effects are recognised", () => {
  assert.equal(toPromoEffect("scroll"), "scroll");
  assert.equal(toPromoEffect("flash"), "flash");
  assert.equal(toPromoEffect("none"), "none");
});

test("anything unrecognised falls back to a still banner", () => {
  // Nothing should be able to start an animation by accident — a stray value
  // from an old import or a hand-edited row must render as plain text.
  for (const bad of ["blink", "SCROLL", "", null, undefined, "marquee"]) {
    assert.equal(toPromoEffect(bad), "none");
  }
});

test("every offered effect survives its own parser", () => {
  // Guards against a dropdown option that silently renders as "none".
  for (const { value } of PROMO_EFFECTS) {
    assert.equal(toPromoEffect(value), value);
  }
});
