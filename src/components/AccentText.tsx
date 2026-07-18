import type { ReactNode } from "react";

/**
 * Renders admin-editable headline text where `*segment*` markers switch the
 * wrapped words to the accent colour — e.g. "Build Better *Health* — Inside
 * and Out." Unmatched or empty markers are rendered literally.
 */
export function AccentText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} className="text-accent">
        {m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
