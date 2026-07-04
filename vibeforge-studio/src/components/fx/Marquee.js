import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx("div", { className: "overflow-hidden", onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false), children: _jsx(motion.div, { className: "flex gap-8 whitespace-nowrap", animate: { x: paused ? undefined : ["0%", "-50%"] }, transition: { duration: 20, repeat: Infinity, ease: "linear", repeatType: "loop" }, children: items.map((p, i) => (_jsxs("span", { className: "inline-flex items-center gap-2 text-sm text-[var(--muted)]", children: [_jsx("span", { className: "text-[var(--accent)]", children: "\u2192" }), " ", p] }, i))) }) }));
}
