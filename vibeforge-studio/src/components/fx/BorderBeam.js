import { jsx as _jsx } from "react/jsx-runtime";
import { motion } from "motion/react";
export function BorderBeam({ active }) {
    if (!active)
        return null;
    return (_jsx(motion.div, { className: "pointer-events-none absolute inset-0 rounded-[inherit]", style: {
            background: "conic-gradient(from var(--beam-angle, 0deg), transparent 270deg, var(--accent) 360deg)",
            padding: "1px",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
        }, animate: { "--beam-angle": "360deg" }, initial: { "--beam-angle": "0deg" }, transition: { duration: 4, repeat: Infinity, ease: "linear" } }));
}
