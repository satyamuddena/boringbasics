"use client";

import { useState } from "react";
import { CalcCard, NumberField, Segmented, Result } from "./ui";

type Sex = "male" | "female";
type Goal = "lose" | "maintain" | "gain";

const activities = [
  { value: "1.2", label: "Sedentary" },
  { value: "1.375", label: "Light" },
  { value: "1.55", label: "Moderate" },
  { value: "1.725", label: "Active" },
  { value: "1.9", label: "Very active" },
];

const goalAdjust: Record<Goal, number> = { lose: -0.2, maintain: 0, gain: 0.1 };

export function TdeeCalculator() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState("1.375");
  const [goal, setGoal] = useState<Goal>("maintain");

  const a = parseInt(age, 10);
  const h = parseFloat(height);
  const w = parseFloat(weight);

  let result: { calories: number; protein: number; fat: number; carbs: number } | null = null;
  if (a > 0 && h > 0 && w > 0) {
    const bmr = 10 * w + 6.25 * h - 5 * a + (sex === "male" ? 5 : -161);
    const tdee = bmr * parseFloat(activity);
    const calories = Math.round(tdee * (1 + goalAdjust[goal]));
    const protein = Math.round(w * 2); // 2 g/kg
    const fat = Math.round((calories * 0.25) / 9); // 25% of kcal
    const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
    result = { calories, protein, fat, carbs };
  }

  return (
    <CalcCard
      title="Calorie & Macro Calculator"
      blurb="Estimate your daily calories and a starting macro split for your goal (Mifflin-St Jeor)."
    >
      <Segmented<Sex>
        label="Sex"
        value={sex}
        onChange={setSex}
        options={[
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
        ]}
      />
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Age" value={age} onChange={setAge} placeholder="30" />
        <NumberField label="Height" value={height} onChange={setHeight} placeholder="170" suffix="cm" />
        <NumberField label="Weight" value={weight} onChange={setWeight} placeholder="70" suffix="kg" />
      </div>
      <Segmented label="Activity level" value={activity} onChange={setActivity} options={activities} />
      <Segmented<Goal>
        label="Goal"
        value={goal}
        onChange={setGoal}
        options={[
          { value: "lose", label: "Lose fat" },
          { value: "maintain", label: "Maintain" },
          { value: "gain", label: "Build muscle" },
        ]}
      />

      {result && (
        <Result>
          <p className="font-display text-5xl text-accent">{result.calories.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-sm text-muted">calories / day</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-line bg-ink-card p-2">
              <p className="font-semibold text-fg">{result.protein} g</p>
              <p className="mt-0.5 text-muted">Protein</p>
            </div>
            <div className="rounded-lg border border-line bg-ink-card p-2">
              <p className="font-semibold text-fg">{result.carbs} g</p>
              <p className="mt-0.5 text-muted">Carbs</p>
            </div>
            <div className="rounded-lg border border-line bg-ink-card p-2">
              <p className="font-semibold text-fg">{result.fat} g</p>
              <p className="mt-0.5 text-muted">Fat</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            A starting point — your real plan is tailored to your blood work and progress.
          </p>
        </Result>
      )}
    </CalcCard>
  );
}
