import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * The pure half of the booking-form CAPTCHA: drawing a challenge and checking an
 * answer. Kept free of `server-only` — and of the signing key and the spent-nonce
 * store, both of which are passed in — so the rules can be unit-tested the way
 * sessionCore and promoBannerCore are. `lib/captcha.ts` owns those and is the
 * module routes should import.
 *
 * The scheme is stateless by design. Everything needed to check an answer travels
 * in a signed token held by the client, so no table and no session are involved.
 * The token carries a salted *hash* of the answer rather than the answer, so
 * handing it to the browser gives nothing away, and it is signed so a caller
 * cannot swap in a hash of their own. The single piece of server state is the set
 * of nonces already redeemed, which is what stops one solved challenge being
 * replayed for a flood of submissions.
 */

/** No I/O/0/1 — they are the characters people misread and then blame the form. */
export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LENGTH = 5;
export const TTL_MS = 10 * 60 * 1000;

const answerHash = (nonce: string, answer: string) =>
  createHash("sha256").update(`${nonce}:${answer.toUpperCase()}`).digest("hex");

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

/** Constant-time compare that tolerates length differences without throwing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

interface Payload {
  /** sha256 of `${nonce}:${CODE}` — never the code itself. */
  h: string;
  n: string;
  /** Issued at, epoch ms. */
  t: number;
}

function randomCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/**
 * Draws the code as an SVG.
 *
 * Fixed light background and dark glyphs rather than theme tokens: this is the
 * one thing on the page that has to stay readable whichever theme is active and
 * whatever accent colour the admin has chosen.
 */
function renderSvg(code: string): string {
  const W = 170;
  const H = 56;
  const parts: string[] = [`<rect width="${W}" height="${H}" rx="10" fill="#f2efe9"/>`];

  // Noise behind the glyphs, so a threshold filter cannot trivially isolate them.
  for (let i = 0; i < 5; i++) {
    parts.push(
      `<path d="M${randomInt(W)} ${randomInt(H)} Q ${randomInt(W)} ${randomInt(H)} ${randomInt(
        W,
      )} ${randomInt(H)}" stroke="#b9b2a6" stroke-width="${1 + randomInt(2)}" fill="none" opacity="0.7"/>`,
    );
  }

  const slot = (W - 24) / LENGTH;
  for (let i = 0; i < LENGTH; i++) {
    const size = 27 + randomInt(8);
    const cx = 12 + slot * i + slot / 2;
    const cy = H / 2 + randomInt(7) - 3;
    const angle = randomInt(45) - 22;
    const shade = ["#2b2622", "#3d332c", "#1f1b18"][randomInt(3)];
    parts.push(
      `<text x="${cx}" y="${cy}" font-family="Georgia,'Times New Roman',serif" font-size="${size}" font-weight="700" fill="${shade}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${angle} ${cx} ${cy})">${code[i]}</text>`,
    );
  }

  // Speckle over the top as well, so the glyph edges are not clean.
  for (let i = 0; i < 26; i++) {
    parts.push(
      `<circle cx="${randomInt(W)}" cy="${randomInt(H)}" r="${1 + randomInt(2)}" fill="#8b8478" opacity="0.5"/>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">${parts.join(
    "",
  )}</svg>`;
}

export interface Challenge {
  /** Opaque signed token — send back alongside the answer. */
  token: string;
  /** `data:` URI for an <img>. */
  image: string;
}

export function buildChallenge(secret: string, now = Date.now()): Challenge {
  const code = randomCode();
  const nonce = randomBytes(12).toString("hex");
  const payload: Payload = { h: answerHash(nonce, code), n: nonce, t: now };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${encoded}.${sign(encoded, secret)}`,
    image: `data:image/svg+xml;base64,${Buffer.from(renderSvg(code)).toString("base64")}`,
  };
}

export type CaptchaReason = "missing" | "invalid" | "expired" | "used" | "wrong";
export type CaptchaResult = { ok: true } | { ok: false; reason: CaptchaReason };

/**
 * `spent` maps a redeemed nonce to the moment it can be forgotten; a passing
 * answer records itself there before returning, so the caller does not have to.
 */
export function checkChallenge(
  token: unknown,
  answer: unknown,
  secret: string,
  spent: Map<string, number>,
  now = Date.now(),
): CaptchaResult {
  if (typeof token !== "string" || typeof answer !== "string" || !token || !answer.trim()) {
    return { ok: false, reason: "missing" };
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !safeEqual(signature, sign(encoded, secret))) {
    return { ok: false, reason: "invalid" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Payload;
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (
    typeof payload?.h !== "string" ||
    typeof payload?.n !== "string" ||
    typeof payload?.t !== "number"
  ) {
    return { ok: false, reason: "invalid" };
  }

  for (const [nonce, expiresAt] of spent) {
    if (expiresAt <= now) spent.delete(nonce);
  }

  if (now - payload.t > TTL_MS) return { ok: false, reason: "expired" };
  // Replay guard runs before the answer check, so a correct answer cannot be
  // reused even by whoever solved it.
  if (spent.has(payload.n)) return { ok: false, reason: "used" };
  if (!safeEqual(payload.h, answerHash(payload.n, answer.trim()))) {
    return { ok: false, reason: "wrong" };
  }

  spent.set(payload.n, payload.t + TTL_MS);
  return { ok: true };
}

/** Plain wording for the visitor. */
export function captchaMessage(reason: CaptchaReason): string {
  switch (reason) {
    case "missing":
      return "Please enter the characters shown in the image.";
    case "expired":
      return "That security check expired. Please try the new image.";
    case "used":
      return "That security check was already used. Please try the new image.";
    default:
      return "Those characters did not match. Please try the new image.";
  }
}
