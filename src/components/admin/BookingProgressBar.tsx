import type { BookingProgress, ProgressStep, Tone } from "@/lib/bookingProgress";

/* The booking funnel as four steps a trainer can read without a legend. */

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  info: "text-muted",
};

const TONE_BOX: Record<Tone, string> = {
  ok: "border-ok/40 bg-ok/10 text-ok",
  warn: "border-warn/40 bg-warn/10 text-warn",
  info: "border-line bg-ink-soft text-muted",
};

function Dot({ step }: { step: ProgressStep }) {
  if (step.state === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-ok/40 bg-ok/10 text-ok">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 12.5l5.5 5.5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (step.state === "now") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-warn/40 bg-warn/10 text-warn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
          <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return <span className="h-6 w-6 rounded-full border border-line bg-ink" />;
}

/** Full four-step bar with timestamps — used inside the booking dialog. */
export function BookingProgressBar({ progress }: { progress: BookingProgress }) {
  return (
    <ol className="flex items-start rounded-xl border border-line bg-ink-soft p-3">
      {progress.steps.map((step, i) => (
        <li key={step.key} className="flex min-w-0 flex-1 items-start">
          <div className="min-w-0 flex-1 px-1 text-center">
            <div className="flex justify-center">
              <Dot step={step} />
            </div>
            <p
              className={`mt-1.5 truncate text-xs font-semibold ${
                step.state === "now" ? "text-warn" : step.state === "done" ? "text-fg" : "text-muted"
              }`}
            >
              {step.label}
            </p>
            <p className="truncate text-[11px] text-muted">{step.note}</p>
          </div>
          {i < progress.steps.length - 1 && (
            <span
              aria-hidden
              className={`mt-3 h-0.5 w-4 shrink-0 sm:w-8 ${
                progress.steps[i + 1].state === "done" ? "bg-ok/40" : "bg-line"
              }`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

/** The "what do I do now" line. Same words everywhere. */
export function BookingNextStep({ progress }: { progress: BookingProgress }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${TONE_BOX[progress.tone]}`}>
      <p className="text-sm font-semibold">{progress.headline}</p>
      <p className="mt-0.5 text-sm opacity-90">{progress.hint}</p>
    </div>
  );
}

/** One-line version for the table's Stage column. */
export function BookingStageSummary({ progress }: { progress: BookingProgress }) {
  const current = progress.steps.find((s) => s.state !== "done") ?? progress.steps[progress.steps.length - 1];
  const done = progress.steps.filter((s) => s.state === "done").length;
  return (
    <div>
      <div className="flex items-center gap-1" aria-hidden>
        {progress.steps.map((s) => (
          <span
            key={s.key}
            className={`h-1.5 w-6 rounded-full ${
              s.state === "done" ? "bg-ok" : s.state === "now" ? "bg-warn" : "bg-line"
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-fg">
        {done} of {progress.steps.length} done
      </p>
      <p className={`text-xs ${TONE_TEXT[progress.tone]}`}>
        {progress.tone === "ok" ? progress.headline : `Next: ${current.label.toLowerCase()}`}
      </p>
    </div>
  );
}
