"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
  ];

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-sidebar-surface border border-sidebar-border">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
            theme === value
              ? "bg-sidebar-active text-sidebar-active-text"
              : "text-sidebar-muted hover:text-sidebar-foreground"
          )}
        >
          <Icon className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
}
