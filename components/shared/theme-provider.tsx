"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
export type Accent = "indigo" | "yellow" | "blue" | "pink" | "green";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
  sidebarSticky: boolean;
  setSidebarSticky: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  accent: "indigo",
  setAccent: () => {},
  sidebarSticky: false,
  setSidebarSticky: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [accent, setAccentState] = useState<Accent>("indigo");
  const [sidebarSticky, setSidebarStickyState] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme) ?? "system";
    setThemeState(stored);
    applyTheme(stored);

    const VALID: Accent[] = ["indigo", "yellow", "blue", "pink", "green"];
    const raw = localStorage.getItem("accent") as Accent;
    const storedAccent = VALID.includes(raw) ? raw : "indigo";
    if (!VALID.includes(raw)) localStorage.setItem("accent", "indigo");
    setAccentState(storedAccent);
    applyAccent(storedAccent);

    setSidebarStickyState(localStorage.getItem("sidebar-sticky") === "true");
  }, []);

  function applyTheme(t: Theme) {
    const isDark =
      t === "dark" ||
      (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    setResolvedTheme(isDark ? "dark" : "light");
  }

  function applyAccent(a: Accent) {
    if (a === "indigo") {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", a);
    }
  }

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  }

  function setAccent(a: Accent) {
    setAccentState(a);
    localStorage.setItem("accent", a);
    applyAccent(a);
  }

  function setSidebarSticky(v: boolean) {
    setSidebarStickyState(v);
    localStorage.setItem("sidebar-sticky", String(v));
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (theme === "system") applyTheme("system"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, accent, setAccent, sidebarSticky, setSidebarSticky }}>
      {children}
    </ThemeContext.Provider>
  );
}
