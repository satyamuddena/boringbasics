"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ButtonLink } from "./Button";
import { goalLabels, type Goal, type Program } from "@/content/site";

type TimeKey = "short" | "medium" | "long";

const goalOptions: Goal[] = ["fat-loss", "muscle-gain", "recomp", "lifestyle"];
const levelOptions = ["Beginner", "Intermediate", "Advanced"];
const timeOptions: { key: TimeKey; label: string }[] = [
  { key: "short", label: "~3 months" },
  { key: "medium", label: "~6 months" },
  { key: "long", label: "~1 year" },
];

const timeToIndex: Record<TimeKey, number> = { short: 0, medium: 1, long: 2 };

export function ProgramFinder({
  programs,
  ctaLabel = "Book a Consultation",
}: {
  programs: Program[];
  ctaLabel?: string;
}) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | "">("");
  const [level, setLevel] = useState("");
  const [time, setTime] = useState<TimeKey | "">("");

  const ordered = [...programs].sort((a, b) => a.displayOrder - b.displayOrder);
  const recommended =
    time !== "" ? ordered[Math.min(timeToIndex[time], ordered.length - 1)] : undefined;

  const optionBtn = (active: boolean) =>
    `rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
      active ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:border-accent/60"
    }`;

  return (
    <div className="rounded-2xl border border-line bg-ink-card p-6 sm:p-8">
      {step < 3 && (
        <div className="mb-6 flex items-center gap-2">
          {[0, 1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22 }}
        >
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-display text-xl uppercase">What&apos;s your main goal?</h3>
              <div className="grid grid-cols-2 gap-3">
                {goalOptions.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setGoal(g);
                      setStep(1);
                    }}
                    className={optionBtn(goal === g)}
                  >
                    {goalLabels[g]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-display text-xl uppercase">Your experience level?</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {levelOptions.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setLevel(l);
                      setStep(2);
                    }}
                    className={optionBtn(level === l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-display text-xl uppercase">How long do you want to commit?</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {timeOptions.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setTime(t.key);
                      setStep(3);
                    }}
                    className={optionBtn(time === t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && recommended && (
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Your match</p>
              <h3 className="font-display text-3xl uppercase">{recommended.title}</h3>
              <p className="mx-auto max-w-md text-muted">
                Based on {goal && goalLabels[goal as Goal].toLowerCase()}
                {level ? `, ${level.toLowerCase()} level` : ""} and your timeframe, this package is the
                best fit. {recommended.shortDescription}
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <ButtonLink href={`/contact?goal=${goal}`} size="lg">
                  {ctaLabel}
                </ButtonLink>
                <ButtonLink href={`/programs/${recommended.slug}`} size="lg" variant="secondary">
                  See the package
                </ButtonLink>
              </div>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="mt-2 text-sm text-muted underline-offset-2 hover:text-accent hover:underline"
              >
                Start over
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step > 0 && step < 3 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="text-sm text-muted transition-colors hover:text-accent"
          >
            ← Back
          </button>
        </div>
      )}

      {programs.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/contact" className="text-accent hover:underline">
            {ctaLabel}
          </Link>{" "}
          and we&apos;ll find your best fit.
        </p>
      )}
    </div>
  );
}
