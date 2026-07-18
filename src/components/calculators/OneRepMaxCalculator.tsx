"use client";

import { useState } from "react";
import { CalcCard, NumberField, Result } from "./ui";

/** Epley formula: 1RM = w × (1 + reps/30). */
export function OneRepMaxCalculator() {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  const oneRm = w > 0 && r > 0 && r <= 12 ? w * (1 + r / 30) : null;

  const pcts = [
    { label: "95% (2–3 reps)", v: 0.95 },
    { label: "85% (5 reps)", v: 0.85 },
    { label: "75% (8–10 reps)", v: 0.75 },
  ];

  return (
    <CalcCard
      title="1-Rep-Max Calculator"
      blurb="Estimate your one-rep max from a set you can do. Best with 1–12 reps."
    >
      <NumberField label="Weight lifted" value={weight} onChange={setWeight} placeholder="60" suffix="kg" />
      <NumberField label="Reps performed" value={reps} onChange={setReps} placeholder="5" />

      {oneRm && (
        <Result>
          <p className="font-display text-5xl text-accent">{Math.round(oneRm)} kg</p>
          <p className="mt-1 text-sm text-muted">estimated 1-rep max</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            {pcts.map((p) => (
              <div key={p.label} className="rounded-lg border border-line bg-ink-card p-2">
                <p className="font-semibold text-fg">{Math.round(oneRm * p.v)} kg</p>
                <p className="mt-0.5 text-muted">{p.label}</p>
              </div>
            ))}
          </div>
        </Result>
      )}
    </CalcCard>
  );
}
