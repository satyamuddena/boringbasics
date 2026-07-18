import { getStats } from "@/lib/content";
import { AnimatedCounter } from "./AnimatedCounter";
import { Reveal } from "./Reveal";

export async function StatsBar() {
  const stats = await getStats();
  return (
    <section className="border-y border-line bg-ink-soft">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        {stats.map((stat, i) => (
          <Reveal
            key={stat.label}
            delay={i * 0.08}
            className="flex flex-col items-center text-center"
          >
            <span className="font-display text-5xl text-accent sm:text-6xl">
              <AnimatedCounter
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
            </span>
            <span className="mt-2 text-xs font-medium uppercase tracking-wider text-muted sm:text-sm">
              {stat.label}
            </span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
