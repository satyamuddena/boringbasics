export type NewsletterIntent = "test" | "broadcast";

export function parseNewsletterIntent(value: unknown): NewsletterIntent | null {
  return value === "test" || value === "broadcast" ? value : null;
}

export function isValidEmailAddress(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function testNewsletterSubject(subject: string): string {
  return `[TEST] ${subject}`;
}
