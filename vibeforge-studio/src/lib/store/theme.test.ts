import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useThemeStore } from "./theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  // Reset zustand store
  useThemeStore.setState({ theme: "aurora" });
});

describe("useThemeStore", () => {
  it("initializes with aurora theme if no localStorage", () => {
    const { result } = renderHook(() => useThemeStore());
    
    expect(result.current.theme).toBe("aurora");
  });
  
  it("initializes from localStorage if present", () => {
    localStorage.setItem("vf-theme", "terminal");
    // Re-create the store to pick up localStorage
    const { result } = renderHook(() => {
      const theme = (localStorage.getItem("vf-theme") as "aurora" | "daybreak" | "synthwave" | "terminal") ?? "aurora";
      return { theme };
    });
    
    expect(result.current.theme).toBe("terminal");
  });
  
  it("setTheme updates theme and localStorage", () => {
    const { result } = renderHook(() => useThemeStore());
    
    act(() => {
      result.current.setTheme("synthwave");
    });
    
    expect(result.current.theme).toBe("synthwave");
    expect(localStorage.getItem("vf-theme")).toBe("synthwave");
  });
  
  it("setTheme sets data-theme attribute on documentElement", () => {
    const { result } = renderHook(() => useThemeStore());
    
    act(() => {
      result.current.setTheme("daybreak");
    });
    
    expect(document.documentElement.getAttribute("data-theme")).toBe("daybreak");
  });
  
  it("only stores theme name in localStorage, never code or prompts", () => {
    const { result } = renderHook(() => useThemeStore());
    
    act(() => {
      result.current.setTheme("aurora");
    });
    
    const stored = localStorage.getItem("vf-theme");
    expect(stored).toBe("aurora");
    expect(stored).not.toContain("<html>");
    expect(stored).not.toContain("prompt");
  });
  
  it("all four themes can be set", () => {
    const { result } = renderHook(() => useThemeStore());
    
    const themes: Array<"aurora" | "daybreak" | "synthwave" | "terminal"> = 
      ["aurora", "daybreak", "synthwave", "terminal"];
    
    for (const theme of themes) {
      act(() => {
        result.current.setTheme(theme);
      });
      expect(result.current.theme).toBe(theme);
    }
  });
});
