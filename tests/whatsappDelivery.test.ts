import assert from "node:assert/strict";
import test from "node:test";
import { whatsAppDelivery } from "../src/lib/whatsappDelivery";

/**
 * The distinction these lock down: Twilio returning 2xx with status "queued"
 * means Twilio accepted the request. It is not evidence the message arrived,
 * and the UI must never present it as though it were.
 */

test("an accepted send is never reported as received", () => {
  for (const status of ["queued", "accepted", "sending", "sent", undefined]) {
    const d = whatsAppDelivery({ ok: true, status, sid: "SM1" } as never);
    assert.equal(d.confirmed, false, `status ${status} must not be confirmed`);
    assert.equal(d.tone, "warn");
    assert.match(d.text, /not confirmed/);
  }
});

test("only a real delivery receipt counts as arrived", () => {
  const delivered = whatsAppDelivery({ ok: true, status: "delivered" });
  assert.equal(delivered.confirmed, true);
  assert.equal(delivered.tone, "ok");
  assert.equal(delivered.text, "Delivered");

  const read = whatsAppDelivery({ ok: true, status: "read" });
  assert.equal(read.confirmed, true);
  assert.equal(read.text, "Read");
});

test("a message accepted then dropped by WhatsApp reads as never arrived", () => {
  const d = whatsAppDelivery({ ok: true, status: "undelivered", errorCode: 63016 });
  assert.equal(d.confirmed, false);
  assert.equal(d.tone, "bad");
  assert.match(d.text, /Never arrived — sent outside the 24-hour window/);
});

test("a rejected send explains itself in plain words", () => {
  assert.match(whatsAppDelivery({ ok: false, errorCode: 63003 }).text, /not on WhatsApp/);
  assert.match(whatsAppDelivery({ ok: false, errorCode: 63051 }).text, /sender is not registered/);
  assert.equal(whatsAppDelivery({ ok: false }).text, "Did not send");
});

test("an unknown Twilio code does not invent an explanation", () => {
  const d = whatsAppDelivery({ ok: false, errorCode: 99999 });
  assert.equal(d.text, "Did not send");
  assert.equal(d.tone, "bad");
});

test("no record at all is not the same as a failure", () => {
  const d = whatsAppDelivery(undefined);
  assert.equal(d.text, "Not sent");
  assert.equal(d.tone, "warn");
  assert.equal(d.confirmed, false);
});
