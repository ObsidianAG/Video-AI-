import { useState } from "react";
import { motion } from "motion/react";

const PROMPTS = [
  "a pomodoro app with juice", "landing page for a synth plugin",
  "retro calculator with sound", "3D spinning cube", "particle rain",
  "typing speed test", "minimal note app", "color palette generator",
  "snake game with neon skin", "interactive piano keyboard",
];

export function Marquee() {
  const [paused, setPaused] = useState(false);
  const items = [...PROMPTS, ...PROMPTS];
  
  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: paused ? undefined : ["0%", "-50%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear", repeatType: "loop" }}
      >
        {items.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
            <span className="text-[var(--accent)]">→</span> {p}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
