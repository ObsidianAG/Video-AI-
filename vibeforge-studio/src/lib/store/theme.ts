import { create } from "zustand";

export type Theme = "aurora" | "daybreak" | "synthwave" | "terminal";

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: (localStorage.getItem("vf-theme") as Theme) ?? "aurora",
  setTheme: (theme) => {
    localStorage.setItem("vf-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
}));
