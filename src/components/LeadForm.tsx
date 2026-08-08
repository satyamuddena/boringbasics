"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./Button";
import { CalendlyEmbed } from "./CalendlyEmbed";
import { PhoneField, isPhoneValid, phoneToE164 } from "./PhoneField";
import { goalLabels, type Goal } from "@/content/site";
import type { CountryCode } from "libphonenumber-js";

const GOAL_VALUES: Goal[] = ["fat-loss", "muscle-gain", "recomp", "lifestyle"];

type Status = "idle" | "submitting" | "error";

interface RazorpayInstance {
  open: () => void;
}
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

interface FormState {
  goal: Goal | "";
  level: string;
  name: string;
  /** ISO-2 country for the phone number, e.g. "IN". */
  country: CountryCode;
  /** National phone number as typed. */
  whatsapp: string;
  email: string;
  message: string;
  /** Newsletter opt-in — uses the same email. */
  subscribe: boolean;
  /** Honeypot — must stay empty. */
  bot_check_xyz: string;
}

const initial: FormState = {
  goal: "",
  level: "",
  name: "",
  country: "IN",
  whatsapp: "",
  email: "",
  message: "",
  subscribe: false,
  bot_check_xyz: "",
};

const goals: Goal[] = ["fat-loss", "muscle-gain", "recomp", "lifestyle"];
const levels = ["Beginner", "Intermediate", "Advanced"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = 3; // details · payment · book
const STEP_LABELS = ["Details", "Payment", "Book"];

type PayState = "idle" | "creating" | "open" | "verifying" | "unconfigured" | "error";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function getSourceMeta() {
  const url = new URL(window.location.href);
  return {
    pageUrl: url.toString(),
    referrer: document.referrer || "",
    utmSource: url.searchParams.get("utm_source") || "",
    utmMedium: url.searchParams.get("utm_medium") || "",
    utmCampaign: url.searchParams.get("utm_campaign") || "",
    program: url.searchParams.get("program") || "",
  };
}

export function LeadForm({
  calendlyUrl,
  consultation,
  brandName,
}: {
  calendlyUrl?: string;
  consultation: { price: number; currency: string; durationLabel: string };
  brandName: string;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const [payState, setPayState] = useState<PayState>("idle");
  const [payError, setPayError] = useState("");
  const [bypassAllowed, setBypassAllowed] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // Pre-fill the goal when arriving from the program-finder quiz (/contact?goal=…).
  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get("goal");
    if (!g || !(GOAL_VALUES as string[]).includes(g)) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm((f) => ({ ...f, goal: g as Goal }));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  /* ---------------- validation ---------------- */
  const goalError = form.goal === "" ? "Please pick a goal." : "";
  const nameError = form.name.trim().length >= 2 ? "" : "Please enter your full name.";
  const phoneValue = { country: form.country, national: form.whatsapp };
  const whatsappError =
    form.whatsapp.trim() === ""
      ? "Please enter your WhatsApp number."
      : isPhoneValid(phoneValue)
        ? ""
        : "Enter a valid mobile number for the selected country.";
  const emailError = EMAIL_RE.test(form.email.trim()) ? "" : "Please enter a valid email address.";
  const detailsValid = !goalError && !nameError && !whatsappError && !emailError;

  const fullWhatsapp = phoneToE164(phoneValue) ?? "";
  const priceLabel = `${consultation.currency === "INR" ? "₹" : ""}${consultation.price.toLocaleString("en-IN")}`;
  const calendlyDirectUrl = calendlyUrl
    ? (() => {
        try {
          const u = new URL(calendlyUrl);
          if (form.name.trim()) u.searchParams.set("name", form.name.trim());
          if (form.email.trim()) u.searchParams.set("email", form.email.trim());
          return u.toString();
        } catch {
          return calendlyUrl;
        }
      })()
    : "";

  function back() {
    setAttempted(false);
    setError("");
    setStep((s) => s - 1);
  }

  // Step 0 → create the booking → step 1.
  async function advanceFromForm() {
    if (!detailsValid) return setAttempted(true);
    setAttempted(false);
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          whatsapp: fullWhatsapp,
          email: form.email.trim(),
          source: getSourceMeta(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.bookingId) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setBookingId(data.bookingId);
      setStatus("idle");
      setStep(1);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 0) void advanceFromForm();
  }

  /* ---------------- payment ---------------- */
  async function startPayment() {
    if (!bookingId) return;
    setPayState("creating");
    setPayError("");
    try {
      const res = await fetch("/api/payment/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.configured === false) {
        setBypassAllowed(!!data.bypassAllowed);
        return setPayState("unconfigured");
      }
      if (!res.ok || !data.orderId) throw new Error(data.error || "Could not start payment.");

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) throw new Error("Payment could not load. Please try again.");

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amountPaise,
        currency: data.currency,
        name: brandName,
        description: `Consultation call (${consultation.durationLabel})`,
        prefill: { name: form.name, email: form.email.trim(), contact: fullWhatsapp },
        theme: { color: "#ff5a0a" },
        handler: async (resp: RazorpayResponse) => {
          setPayState("verifying");
          try {
            const v = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId, ...resp }),
            });
            if (!v.ok) throw new Error();
            setPayState("idle");
            setStep(2);
          } catch {
            setPayState("error");
            setPayError("We couldn't confirm your payment. If you were charged, contact us and we'll sort it out.");
          }
        },
        modal: { ondismiss: () => setPayState("idle") },
      });
      rzp.open();
      setPayState("open");
    } catch (err) {
      setPayState("error");
      setPayError(err instanceof Error ? err.message : "Could not start payment.");
    }
  }

  // Test-only: skip the charge and advance to slot selection.
  async function bypassPayment() {
    if (!bookingId) return;
    setPayState("verifying");
    setPayError("");
    try {
      const res = await fetch("/api/payment/bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) throw new Error();
      setPayState("idle");
      setStep(2);
    } catch {
      setPayState("unconfigured");
      setPayError("Couldn't skip payment. Please try again.");
    }
  }

  /* ---------------- booking (calendly) ---------------- */
  const handleScheduled = useCallback(
    (payload: { event?: { uri?: string } }) => {
      if (!bookingId) return;
      setBookingError("");
      void fetch("/api/booking/booked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, calendlyEventUri: payload?.event?.uri }),
      }).then((res) => {
        if (res.ok) {
          setBooked(true);
        } else {
          setBookingError("The slot was selected, but we couldn't verify it. Please contact us with your booking ID.");
        }
      }).catch(() => {
        setBookingError("The slot was selected, but we couldn't verify it. Please contact us with your booking ID.");
      });
    },
    [bookingId],
  );

  /* ---------------- success ---------------- */
  if (booked || (step === 2 && !calendlyUrl)) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-ink-card p-8 text-center shadow-glow">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mt-4 font-display text-2xl uppercase">
          {booked ? "You're booked!" : "Payment received!"}
        </h3>
        <p className="mt-2 text-muted">
          {booked
            ? `Thanks ${form.name.split(" ")[0]} — check your email for the confirmation and calendar invite. See you on the call!`
            : "Payment is received. I'll email you to lock in a time for your consultation."}
          {form.subscribe && " You're also on the newsletter list — welcome!"}
        </p>
        {bookingId && <p className="mt-3 text-xs text-muted">Booking ID: #{bookingId}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-ink-card p-6 sm:p-8">
      {/* Progress */}
      <div className="mb-6" aria-label="Booking progress">
        <div className="flex items-center gap-2">
          {Array.from({ length: STEPS }, (_, s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-accent" : "bg-line"}`}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 text-center text-xs text-muted">
          {STEP_LABELS.map((label, index) => (
            <span key={label} className={index === step ? "text-accent" : ""}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <fieldset className="space-y-5">
              <legend className="font-display text-xl uppercase">Tell me about your goal</legend>
              <div className="grid grid-cols-2 gap-3">
                {goals.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => update({ goal: g })}
                    aria-pressed={form.goal === g}
                    className={`rounded-xl border px-4 py-4 text-sm font-medium transition-colors ${
                      form.goal === g
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line text-muted hover:border-accent/60"
                    }`}
                  >
                    {goalLabels[g]}
                  </button>
                ))}
              </div>
              <FieldError show={attempted} message={goalError} />
              <div>
                <label className="mb-2 block text-sm text-muted">Your current level (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {levels.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => update({ level: form.level === l ? "" : l })}
                      aria-pressed={form.level === l}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        form.level === l
                          ? "border-accent bg-accent text-ink"
                          : "border-line text-muted hover:border-accent/60"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Full name" required>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className={inputCls(attempted && !!nameError)}
                  placeholder="Your name"
                  autoComplete="name"
                />
                <FieldError show={attempted} message={nameError} />
              </Field>
              <Field label="WhatsApp number" required>
                <PhoneField
                  value={phoneValue}
                  onChange={(next) => update({ country: next.country, whatsapp: next.national })}
                  invalid={attempted && !!whatsappError}
                />
                <FieldError show={attempted} message={whatsappError} />
              </Field>
              <Field label="Email" required>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                  className={inputCls(attempted && !!emailError)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <FieldError show={attempted} message={emailError} />
              </Field>
              <Field label="Anything else? (optional)">
                <textarea
                  value={form.message}
                  onChange={(e) => update({ message: e.target.value })}
                  rows={3}
                  className={inputCls(false)}
                  placeholder="Tell me a little about where you're starting from…"
                />
              </Field>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-ink px-4 py-3 transition-colors hover:border-accent/60">
                <input
                  type="checkbox"
                  checked={form.subscribe}
                  onChange={(e) => update({ subscribe: e.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent,#ff5722)]"
                />
                <span className="text-sm text-muted">
                  Send me the {brandName} newsletter — fitness tips and updates to the email
                  above. Unsubscribe anytime with one click.
                </span>
              </label>
            </fieldset>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-display text-xl uppercase">Secure your slot</h3>
              <div className="rounded-xl border border-line bg-ink px-4 py-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted">Consultation call · {consultation.durationLabel}</span>
                  <span className="font-display text-2xl text-accent">{priceLabel}</span>
                </div>
                {bookingId && <p className="mt-2 text-xs text-muted">Booking ID: #{bookingId}</p>}
                <p className="mt-2 text-sm text-muted">
                  Pay to confirm. You&apos;ll immediately pick a time on the next step.
                  If payment succeeds but scheduling fails, use your booking ID when contacting us.
                </p>
              </div>

              {payState === "unconfigured" ? (
                bypassAllowed ? (
                  <div className="space-y-2">
                    <p className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
                      Online payment isn&apos;t set up yet — but test mode is on, so you can skip
                      it to try the rest of the booking flow.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={bypassPayment}
                      className="w-full border-dashed"
                    >
                      Skip payment (test mode) →
                    </Button>
                    <p className="text-center text-xs text-muted/60">
                      For testing only — no charge is made.
                    </p>
                    {payError && <p className="text-sm text-bad">{payError}</p>}
                  </div>
                ) : (
                  <p className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
                    Online payment isn&apos;t set up yet. Please reach out on WhatsApp or email
                    (see the contact card) and we&apos;ll arrange your consultation.
                  </p>
                )
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={startPayment}
                    disabled={payState === "creating" || payState === "open" || payState === "verifying"}
                    className="w-full"
                  >
                    {payState === "creating"
                      ? "Starting…"
                      : payState === "open"
                        ? "Complete payment…"
                        : payState === "verifying"
                          ? "Confirming…"
                          : `Pay ${priceLabel} & continue`}
                  </Button>
                  {payError && <p className="text-sm text-bad">{payError}</p>}
                  <p className="text-center text-xs text-muted/60">
                    Payments are processed securely by Razorpay. The fee is adjusted against your
                    coaching package if you enrol.
                  </p>
                </>
              )}
            </div>
          )}

          {step === 2 && calendlyUrl && (
            <div className="space-y-4">
              <h3 className="font-display text-xl uppercase">Pick your time</h3>
              <p className="text-sm text-muted">
                Payment received. Choose a slot below — you&apos;ll get a confirmation email and
                calendar invite instantly.
              </p>
              {bookingId && <p className="text-xs text-muted">Booking ID: #{bookingId}</p>}
              <a
                href={calendlyDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-ink"
              >
                Open Calendly in a new tab
              </a>
              <CalendlyEmbed
                url={calendlyUrl}
                prefill={{ name: form.name, email: form.email.trim() }}
                onScheduled={handleScheduled}
              />
              <p className="text-xs text-muted">
                If the scheduler does not load, use the Calendly button above or message us with
                your booking ID.
              </p>
              {bookingError && (
                <p className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn" aria-live="polite">
                  {bookingError}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Honeypot field — hidden from users, catches bots */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label>
          Leave this empty
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.bot_check_xyz}
            onChange={(e) => update({ bot_check_xyz: e.target.value })}
          />
        </label>
      </div>

      {status === "error" && (
        <p className="mt-4 text-sm text-bad" aria-live="polite">
          {error}
        </p>
      )}

      {/* Navigation — only the details step has Back/Continue here; payment
          and booking drive their own progression. */}
      {step === 0 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <span />
          <Button key="continue" type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Saving…" : "Continue to payment →"}
          </Button>
        </div>
      )}
      {step === 1 && (
        <div className="mt-6">
          <Button type="button" variant="ghost" onClick={back}>
            ← Back
          </Button>
        </div>
      )}
    </form>
  );
}

// Width lives in `extra` (default w-full) so callers can override it without a
// conflicting `w-full` — e.g. the fixed-width country-code box.
const inputCls = (invalid: boolean, extra = "w-full") =>
  `rounded-xl border bg-ink px-4 py-3 text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${
    invalid ? "border-bad" : "border-line"
  } ${extra}`;

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show || !message) return null;
  return <p className="mt-2 text-xs text-bad">{message}</p>;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
    </label>
  );
}
