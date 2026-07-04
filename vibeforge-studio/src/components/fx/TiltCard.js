import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
export function TiltCard({ children, className, onMouseEnter, onMouseLeave }) {
    const ref = useRef(null);
    const rotateX = useMotionValue(0);
    const rotateY = useMotionValue(0);
    const sx = useSpring(rotateX, { stiffness: 300, damping: 20 });
    const sy = useSpring(rotateY, { stiffness: 300, damping: 20 });
    return (_jsx(motion.div, { ref: ref, style: { rotateX: sx, rotateY: sy, transformStyle: "preserve-3d" }, whileHover: { z: 20 }, onPointerMove: (e) => {
            const r = ref.current.getBoundingClientRect();
            const cx = (e.clientX - r.left) / r.width - 0.5;
            const cy = (e.clientY - r.top) / r.height - 0.5;
            rotateX.set(-cy * 8);
            rotateY.set(cx * 8);
        }, onPointerLeave: () => { rotateX.set(0); rotateY.set(0); }, onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave, className: className, children: children }));
}
