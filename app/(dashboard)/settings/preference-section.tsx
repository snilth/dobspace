"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Accent } from "@/components/shared/theme-provider";
import { cn } from "@/lib/utils";
import { Section } from "./account-section";

const MODES = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

const ACCENTS: { value: Accent; label: string; color: string; ring: string }[] = [
  { value: "indigo", label: "Indigo", color: "bg-[oklch(57%_0.245_278)]", ring: "ring-[oklch(57%_0.245_278)]" },
  { value: "yellow", label: "Yellow", color: "bg-[oklch(72%_0.18_88)]",  ring: "ring-[oklch(72%_0.18_88)]"  },
  { value: "blue",   label: "Blue",   color: "bg-[oklch(55%_0.22_228)]", ring: "ring-[oklch(55%_0.22_228)]" },
  { value: "pink",   label: "Pink",   color: "bg-[oklch(57%_0.22_345)]", ring: "ring-[oklch(57%_0.22_345)]" },
  { value: "green",  label: "Green",  color: "bg-[oklch(52%_0.19_148)]", ring: "ring-[oklch(52%_0.19_148)]" },
];

export function PreferenceSection() {
  const { theme, setTheme, accent, setAccent } = useTheme();

  return (
    <Section title="Preferences" description="Appearance and display settings">
      {/* Mode */}
      <div>
        <p className="text-xs font-semibold text-foreground-2 mb-3">Mode</p>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-2.5 py-4 rounded-[10px] border-2 transition-all",
                theme === value
                  ? "border-brand bg-brand-subtle text-brand"
                  : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[12px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <p className="text-xs font-semibold text-foreground-2 mb-3">Accent color</p>
        <div className="flex items-center gap-3 flex-wrap">
          {ACCENTS.map(({ value, label, color, ring }) => (
            <button
              key={value}
              onClick={() => setAccent(value)}
              title={label}
              className={cn(
                "group flex flex-col items-center gap-1.5",
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full transition-all",
                color,
                accent === value
                  ? `ring-2 ring-offset-2 ring-offset-card ${ring} scale-110`
                  : "hover:scale-110 opacity-70 hover:opacity-100"
              )} />
              <span className={cn(
                "text-[10px] font-semibold transition-colors",
                accent === value ? "text-foreground" : "text-muted"
              )}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}
