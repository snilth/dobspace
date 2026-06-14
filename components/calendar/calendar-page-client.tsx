"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarView } from "./calendar-view";
import { MyCoursesCalendarView } from "./my-courses-calendar-view";

const TABS = [
  { value: "team",    label: "Project" },
  { value: "courses", label: "Courses" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export function CalendarPageClient({ workspaceId }: { workspaceId: string }) {
  const [tab, setTab] = useState<Tab>("team");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "px-3 h-8 rounded-lg border text-[13px] font-medium transition-colors",
              tab === t.value
                ? "bg-surface-3 border-border text-foreground"
                : "bg-card border-border text-muted hover:text-foreground hover:bg-surface-2"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "team" ? <CalendarView workspaceId={workspaceId} /> : <MyCoursesCalendarView />}
      </div>
    </div>
  );
}
