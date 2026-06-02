"use client";

import { Sun, Moon, Monitor, PanelLeft } from "lucide-react";
import { useTheme, type Accent } from "@/components/shared/theme-provider";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Section } from "./account-section";

const KIMMY_ALLOWED = ["kimmy@email.dev", "vivi@email.dev"];

const MODES = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

const BASE_ACCENTS: { value: Accent; label: string; color: string; ring: string }[] = [
  { value: "indigo", label: "Indigo", color: "bg-[oklch(57%_0.245_278)]", ring: "ring-[oklch(57%_0.245_278)]" },
  { value: "yellow", label: "Yellow", color: "bg-[oklch(72%_0.18_88)]",   ring: "ring-[oklch(72%_0.18_88)]"  },
  { value: "blue",   label: "Blue",   color: "bg-[oklch(55%_0.22_228)]",  ring: "ring-[oklch(55%_0.22_228)]" },
  { value: "pink",   label: "Pink",   color: "bg-[oklch(60%_0.22_345)]",  ring: "ring-[oklch(60%_0.22_345)]" },
  { value: "green",  label: "Green",  color: "bg-[oklch(52%_0.19_148)]",  ring: "ring-[oklch(52%_0.19_148)]" },
];

const KIMMY_ACCENT = {
  value: "kimmy" as Accent,
  label: "Kimmy 🐱",
  color: "bg-[#FAACBF]",
  ring: "ring-[#FAACBF]",
};

export function PreferenceSection() {
  const { theme, setTheme, accent, setAccent, sidebarSticky, setSidebarSticky } = useTheme();
  const { data: session } = useSession();
  const isKimmy = KIMMY_ALLOWED.includes(session?.user.email ?? "");
  const ACCENTS = isKimmy ? [...BASE_ACCENTS, KIMMY_ACCENT] : BASE_ACCENTS;

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

      {/* Sidebar */}
      <div>
        <p className="text-xs font-semibold text-foreground-2 mb-3">Sidebar</p>
        <button
          onClick={() => setSidebarSticky(!sidebarSticky)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-[10px] border-2 transition-all",
            sidebarSticky
              ? "border-brand bg-brand-subtle text-brand"
              : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <PanelLeft className="w-4 h-4" />
            <div className="text-left">
              <p className="text-[13px] font-semibold leading-none mb-0.5">Keep sidebar expanded</p>
              <p className="text-[11px] opacity-70">Always show full sidebar, no hover needed</p>
            </div>
          </div>
          <div className={cn(
            "w-10 h-6 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0",
            sidebarSticky ? "bg-brand" : "bg-surface-3"
          )}>
            <div className={cn(
              "w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
              sidebarSticky ? "translate-x-4" : "translate-x-0"
            )} />
          </div>
        </button>
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
