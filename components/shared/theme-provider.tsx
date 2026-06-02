"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";

type Theme = "light" | "dark" | "system";
export type Accent = "indigo" | "yellow" | "blue" | "pink" | "green" | "kimmy";

const VALID_ACCENTS: Accent[] = ["indigo", "yellow", "blue", "pink", "green", "kimmy"];

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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trpc = useTRPC();
  const { data: serverTheme } = useQuery(trpc.userTheme.get.queryOptions());
  const { mutate: saveTheme } = useMutation(trpc.userTheme.set.mutationOptions());

  // Init from localStorage on mount
  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme) ?? "system";
    setThemeState(stored);
    applyTheme(stored);

    const raw = localStorage.getItem("accent") as Accent;
    const storedAccent = VALID_ACCENTS.includes(raw) ? raw : "indigo";
    if (!VALID_ACCENTS.includes(raw)) localStorage.setItem("accent", "indigo");
    setAccentState(storedAccent);
    applyAccent(storedAccent);

    setSidebarStickyState(localStorage.getItem("sidebar-sticky") === "true");
  }, []);

  // Sync from server once loaded — server wins over localStorage
  // If server returns null (user has no saved preference), reset to defaults to clear previous account's theme
  useEffect(() => {
    if (!serverTheme) return;
    const accent = (serverTheme.accent && VALID_ACCENTS.includes(serverTheme.accent))
      ? serverTheme.accent as Accent
      : "indigo";
    setAccentState(accent);
    localStorage.setItem("accent", accent);
    applyAccent(accent);

    const mode = (serverTheme.mode as Theme) ?? "system";
    setThemeState(mode);
    localStorage.setItem("theme", mode);
    applyTheme(mode);
  }, [serverTheme]);

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

  function scheduleSave(patch: { accent?: Accent; mode?: Theme }) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveTheme(patch), 800);
  }

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
    scheduleSave({ mode: t });
  }

  function setAccent(a: Accent) {
    setAccentState(a);
    localStorage.setItem("accent", a);
    applyAccent(a);
    scheduleSave({ accent: a });
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
