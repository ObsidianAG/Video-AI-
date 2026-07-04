import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from "react";
import { useThemeStore } from "./lib/store/theme";
import { Routes } from "./routes";
import "./styles/theme.css";
export default function App() {
    const theme = useThemeStore((s) => s.theme);
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);
    return _jsx(Routes, {});
}
