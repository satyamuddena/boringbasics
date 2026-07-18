"use client";

import { useState } from "react";
import { CalcCard, NumberField, Result } from "./ui";

function category(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-300" };
  if (bmi < 25) return { label: "Healthy weight", color: "text-accent" };
  if (bmi < 30) return { label: "Overweight", color: "text-warn" };
  return { label: "Obese", color: "text-bad" };
}

export function BmiCalculator() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const h = parseFloat(height) / 100;
  const w = parseFloat(weight);
  const bmi = h > 0 && w > 0 ? w / (h * h) : null;
  const cat = bmi ? category(bmi) : null;

  return (
    <CalcCard title="BMI Calculator" blurb="A quick body-mass-index estimate from your height and weight.">
      <NumberField label="Height" value={height} onChange={setHeight} placeholder="170" suffix="cm" />
      <NumberField label="Weight" value={weight} onChange={setWeight} placeholder="70" suffix="kg" />

      {bmi && cat && (
        <Result>
          <p className="font-display text-5xl text-accent">{bmi.toFixed(1)}</p>
          <p className={`mt-1 text-sm font-semibold ${cat.color}`}>{cat.label}</p>
          <p className="mt-2 text-xs text-muted">
            BMI is a rough guide and doesn&apos;t account for muscle mass. For a plan built around you,
            book a consultation.
          </p>
        </Result>
      )}
    </CalcCard>
  );
}
