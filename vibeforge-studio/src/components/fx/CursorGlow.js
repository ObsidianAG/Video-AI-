import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
export function CursorGlow() {
    const ref = useRef(null);
    useEffect(() => {
        let rafId;
        let tx = -9999, ty = -9999;
        let cx = -9999, cy = -9999;
        const onMove = (e) => { tx = e.clientX; ty = e.clientY; };
        window.addEventListener("mousemove", onMove);
        const tick = () => {
            cx += (tx - cx) * 0.12;
            cy += (ty - cy) * 0.12;
            if (ref.current) {
                ref.current.style.transform = `translate(${cx - 240}px, ${cy - 240}px)`;
            }
            rafId = requestAnimationFrame(tick);
        };
        tick();
        return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafId); };
    }, []);
    return (_jsx("div", { ref: ref, "aria-hidden": "true", className: "pointer-events-none fixed top-0 left-0 z-0 h-[480px] w-[480px] rounded-full", style: {
            background: "radial-gradient(circle, rgba(125,244,255,0.08) 0%, transparent 70%)",
            mixBlendMode: "screen",
        } }));
}
