import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
let toastQueue = [];
let listeners = [];
export function showToast(message, action) {
    const id = Date.now().toString();
    toastQueue.push({ id, message, action });
    listeners.forEach((fn) => fn());
    setTimeout(() => {
        toastQueue = toastQueue.filter((t) => t.id !== id);
        listeners.forEach((fn) => fn());
    }, 4000);
}
export function Toast() {
    const [toasts, setToasts] = useState([]);
    useEffect(() => {
        const update = () => setToasts([...toastQueue]);
        listeners.push(update);
        return () => { listeners = listeners.filter((fn) => fn !== update); };
    }, []);
    return (_jsx("div", { className: "fixed bottom-6 right-6 z-50 flex flex-col gap-3", children: _jsx(AnimatePresence, { children: toasts.map((toast) => (_jsx(motion.div, { initial: { opacity: 0, y: 20, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, x: 100 }, transition: { type: "spring", stiffness: 300, damping: 25 }, className: "rounded-[12px] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] shadow-lg border border-[var(--line)]", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { children: toast.message }), toast.action && (_jsx("button", { className: "text-[var(--accent)] font-medium hover:underline", children: toast.action }))] }) }, toast.id))) }) }));
}
