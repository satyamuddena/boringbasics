import assert from "node:assert/strict";
import test from "node:test";
import {
  appointmentDateAndTime,
  bookingDateAndTime,
  customerTemplateVariables,
  normaliseWhatsAppDigits,
  trainerTemplateVariables,
  type BookingWhatsAppPayload,
} from "../src/lib/whatsappTemplate";

const booking: BookingWhatsAppPayload = {
  name: "John Doe",
  whatsapp: "+919999999999",
  email: "john@email.com",
  bookedAt: "2026-06-01T09:15:00+05:30",
  scheduledAt: "2026-07-20T18:00:00+05:30",
  brand: "Boring Basics",
  durationLabel: "45 minutes",
};

test("formats a slot as the date and time both messages show", () => {
  assert.deepEqual(bookingDateAndTime("2026-07-20T18:00:00+05:30"), {
    date: "20 July",
    time: "6:00 PM",
  });
});

test("renders a UTC start time in IST", () => {
  // Calendly returns UTC; 12:30Z is 6:00 PM in Asia/Kolkata.
  assert.deepEqual(bookingDateAndTime("2026-07-20T12:30:00Z"), {
    date: "20 July",
    time: "6:00 PM",
  });
});

test("uses the Calendly slot, not the moment the booking was made", () => {
  assert.deepEqual(appointmentDateAndTime(booking), { date: "20 July", time: "6:00 PM" });
});

test("falls back to the booking timestamp when no slot time is available", () => {
  assert.deepEqual(appointmentDateAndTime({ ...booking, scheduledAt: null }), {
    date: "1 June",
    time: "9:15 AM",
  });
});

test("trainer template carries name, phone, slot date/time and email in order", () => {
  assert.deepEqual(trainerTemplateVariables(booking), {
    "1": "John Doe",
    "2": "+919999999999",
    "3": "20 July",
    "4": "6:00 PM",
    "5": "john@email.com",
  });
});

test("customer template greets by first name and signs off with the brand", () => {
  assert.deepEqual(customerTemplateVariables(booking), {
    "1": "John",
    "2": "20 July",
    "3": "6:00 PM",
    "4": "45 minutes",
    "5": "Boring Basics",
  });
});

test("never emits an empty Content variable, which Twilio rejects", () => {
  const sparse = customerTemplateVariables({
    ...booking,
    name: "Ada",
    brand: "",
    durationLabel: undefined,
  });
  assert.equal(sparse["4"], "—");
  assert.equal(sparse["5"], "—");
  assert.equal(trainerTemplateVariables({ ...booking, email: null })["5"], "—");
});

test("normalises recipients written with any punctuation", () => {
  assert.equal(normaliseWhatsAppDigits("+91 99999 99999"), "919999999999");
  assert.equal(normaliseWhatsAppDigits("919999999999"), "919999999999");
  assert.equal(normaliseWhatsAppDigits("whatsapp:+919999999999"), "919999999999");
  assert.equal(normaliseWhatsAppDigits("+91-99999-99999"), "919999999999");
});

test("rejects recipients that cannot be dialled", () => {
  assert.equal(normaliseWhatsAppDigits("+91XXXXXXXXXX"), null); // placeholder, no digits
  assert.equal(normaliseWhatsAppDigits("099999999999"), null); // leading zero
  assert.equal(normaliseWhatsAppDigits("12345"), null); // too short
  assert.equal(normaliseWhatsAppDigits("9".repeat(16)), null); // beyond E.164
  assert.equal(normaliseWhatsAppDigits(""), null);
  assert.equal(normaliseWhatsAppDigits(null), null);
  assert.equal(normaliseWhatsAppDigits(undefined), null);
});
