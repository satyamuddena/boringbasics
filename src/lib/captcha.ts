import "server-only";
import { randomBytes } from "node:crypto";
import { buildChallenge, checkChallenge, TTL_MS, type CaptchaResult } from "./captchaCore";

/**
 * The booking form's CAPTCHA, wired to this server's key and replay store.
 *
 * Self-hosted rather than reCAPTCHA/Turnstile, to keep the "runs with no
 * external keys" property the rest of the app has — nothing is fetched from or
 * reported to a third party. The rules themselves live in ./captchaCore.ts,
 * which is kept testable; this module holds the two things that must not.
 */

export { captchaMessage } from "./captchaCore";

/**
 * Signing key. An env var lets it outlive a restart (and be shared if this is
 * ever run as more than one instance); without one a per-boot random key is
 * fine, and simply means challenges issued before a deploy are refused after
 * it. The form requests a fresh image whenever one is refused, so a visitor
 * mid-form sees a new image rather than a dead end.
 */
const SECRET = process.env.CAPTCHA_SECRET || randomBytes(32).toString("hex");

/**
 * Nonces already redeemed, mapped to when they can be forgotten. In-process for
 * the same reason as the limiter in ./rate-limit.ts: SQLite needs a single
 * writer, so this app is deployed as one instance. Replace with a shared store
 * if that stops being true — until then, entries expire with the challenge and
 * the map stays bounded by the issue rate over TTL_MS.
 */
const spent = new Map<string, number>();

export function issueCaptcha() {
  return buildChallenge(SECRET);
}

export function verifyCaptcha(token: unknown, answer: unknown): CaptchaResult {
  return checkChallenge(token, answer, SECRET, spent);
}

export { TTL_MS as CAPTCHA_TTL_MS };
