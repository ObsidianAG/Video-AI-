import { create } from "zustand";
export const useThemeStore = create((set) => ({
    theme: localStorage.getItem("vf-theme") ?? "aurora",
    setTheme: (theme) => {
        localStorage.setItem("vf-theme", theme);
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
    },
}));
