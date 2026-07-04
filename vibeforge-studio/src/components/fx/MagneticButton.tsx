import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export function MagneticButton(
  { children, ...rest }: React.ComponentProps<typeof motion.button>
) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 });
  const sy = useSpring(y, { stiffness: 300, damping: 20 });
  return (
    <motion.button
      ref={ref} style={{ x: sx, y: sy }} whileHover={{ scale: 1.03 }}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set(Math.max(-14, Math.min(14, e.clientX - r.left - r.width / 2)) * 0.35);
        y.set(Math.max(-14, Math.min(14, e.clientY - r.top - r.height / 2)) * 0.35);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
      className="rounded-[10px] bg-[var(--accent)] px-6 py-3 font-medium text-[var(--bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      {...rest}
    >
      {children}
    </motion.button>
  );
}
