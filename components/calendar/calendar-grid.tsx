"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function CalendarGrid<T,>({
  title,
  year,
  month,
  onPrevMonth,
  onNextMonth,
  itemsByDay,
  renderItem,
  headerExtra,
}: {
  title: string;
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  itemsByDay: Map<number, T[]>;
  renderItem: (item: T) => React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  const today = new Date();
  const daysInMonth  = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const totalCells   = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-1">
            <button onClick={onPrevMonth} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[14px] font-medium text-foreground min-w-[140px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={onNextMonth} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {headerExtra && <div className="flex items-center gap-2">{headerExtra}</div>}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 overflow-hidden" style={{ flex: 1, gridTemplateRows: `repeat(${totalCells / 7}, minmax(0, 1fr))` }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const day = i - firstWeekday + 1;
            const isValid = day >= 1 && day <= daysInMonth;
            const dayItems = isValid ? (itemsByDay.get(day) ?? []) : [];

            return (
              <div
                key={i}
                className={cn(
                  "border-b border-r border-border flex flex-col overflow-hidden",
                  !isValid && "bg-surface-2/30",
                  isToday(day) && isValid && "bg-brand/3"
                )}
              >
                {isValid && (
                  <>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium flex-shrink-0 mt-2 ml-2 mb-1",
                      isToday(day) ? "bg-brand text-brand-foreground" : "text-foreground"
                    )}>
                      {day}
                    </div>
                    <div className="flex flex-col gap-1.5 overflow-y-auto px-2 pb-2 flex-1 min-h-0">
                      {dayItems.map((item) => renderItem(item))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
