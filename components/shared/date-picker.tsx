"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const POPOVER_WIDTH = 264;
const DATE_POPOVER_HEIGHT = 330;
const DATETIME_POPOVER_HEIGHT = 390;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateValue(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDisplayTime(time: string) {
  const m = /^(\d{2}):(\d{2})/.exec(time);
  if (!m) return time;
  const h = Number(m[1]);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m[2]} ${period}`;
}

// A click/scroll outside ANY of the given elements (trigger + portaled popover) dismisses.
function useDismiss(refs: React.RefObject<HTMLElement | null>[], onDismiss: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onDismiss();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", onDismiss, true);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", onDismiss, true);
    };
  }, [refs, onDismiss, active]);
}

// Positions a fixed popover near its trigger, flipping above and clamping
// to the viewport so it never gets cut off by a modal's overflow-hidden edge.
function usePopoverPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  width: number,
  height: number,
  align: "left" | "right"
) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      setPosition(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    let left = align === "right" ? rect.right - width : rect.left;
    left = Math.min(Math.max(left, 8), window.innerWidth - width - 8);

    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) {
      const above = rect.top - height - 6;
      top = above >= 8 ? above : Math.max(8, window.innerHeight - height - 8);
    }

    setPosition({ top, left });
  }, [open, triggerRef, width, height, align]);

  return position;
}

function MonthCalendar({
  viewYear,
  viewMonth,
  selected,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
}: {
  viewYear: number;
  viewMonth: number;
  selected: Date | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: number) => void;
}) {
  const today = new Date();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
  const isSelected = (day: number) =>
    !!selected && day === selected.getDate() && viewMonth === selected.getMonth() + 1 && viewYear === selected.getFullYear();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={onPrevMonth} className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[13px] font-semibold text-foreground">
          {MONTHS[viewMonth - 1]} {viewYear}
        </span>
        <button type="button" onClick={onNextMonth} className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted uppercase tracking-wide py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: totalCells }, (_, i) => {
          const day = i - firstWeekday + 1;
          const isValid = day >= 1 && day <= daysInMonth;
          return (
            <div key={i} className="flex items-center justify-center">
              {isValid && (
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] font-medium transition-colors",
                    isSelected(day)
                      ? "bg-brand text-brand-foreground"
                      : isToday(day)
                      ? "text-brand font-semibold ring-1 ring-inset ring-brand/40"
                      : "text-foreground hover:bg-surface-2"
                  )}
                >
                  {day}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = parseDateValue(value);
  const [viewYear, setViewYear] = useState(() => (selected ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected ?? new Date()).getMonth() + 1);

  useDismiss([containerRef, popoverRef], () => setOpen(false), open);
  const position = usePopoverPosition(triggerRef, open, POPOVER_WIDTH, DATE_POPOVER_HEIGHT, "left");

  function toggleOpen() {
    if (!open) {
      const base = selected ?? new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth() + 1);
    }
    setOpen((o) => !o);
  }

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    onChange(toDateValue(new Date(viewYear, viewMonth - 1, day)));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={cn(
          "w-full h-10 px-3 text-sm bg-surface border border-border rounded-btn outline-none transition-all flex items-center justify-between gap-2",
          open ? "border-brand/60 ring-3 ring-brand/8" : "focus:border-brand/60 focus:ring-3 focus:ring-brand/8",
          className
        )}
      >
        <span className={selected ? "text-foreground" : "text-muted-2"}>
          {selected ? formatDisplayDate(selected) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-muted shrink-0" />
      </button>

      {open && position && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[110] w-66 bg-card border border-border rounded-card shadow-xl p-3"
          style={{ top: position.top, left: position.left }}
        >
          <MonthCalendar
            viewYear={viewYear}
            viewMonth={viewMonth}
            selected={selected}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onSelectDay={selectDay}
          />
          {selected && (
            <div className="flex justify-end mt-1 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-[12px] font-medium text-muted hover:text-error transition-colors"
              >
                Clear date
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [datePart, timePart] = value.includes("T") ? (value.split("T") as [string, string]) : [value, ""];
  const selected = parseDateValue(datePart);
  const [viewYear, setViewYear] = useState(() => (selected ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected ?? new Date()).getMonth() + 1);

  useDismiss([containerRef, popoverRef], () => setOpen(false), open);
  const position = usePopoverPosition(triggerRef, open, POPOVER_WIDTH, DATETIME_POPOVER_HEIGHT, "right");

  function toggleOpen() {
    if (!open) {
      const base = selected ?? new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth() + 1);
    }
    setOpen((o) => !o);
  }

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    const d = toDateValue(new Date(viewYear, viewMonth - 1, day));
    onChange(`${d}T${timePart || "12:00"}`);
  }

  function changeTime(t: string) {
    const d = datePart || toDateValue(new Date());
    onChange(`${d}T${t}`);
  }

  const display = selected
    ? `${formatDisplayDate(selected)}${timePart ? ` · ${formatDisplayTime(timePart)}` : ""}`
    : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={cn(
          "h-9 px-3 text-[12px] rounded-full border border-border bg-surface-2 text-foreground-2 outline-none transition-all flex items-center gap-1.5 whitespace-nowrap",
          open ? "ring-2 ring-brand/30 border-brand" : "focus:ring-2 focus:ring-brand/30 focus:border-brand",
          className
        )}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-muted shrink-0" />
        <span className={selected ? "" : "text-muted-2"}>{display}</span>
      </button>

      {open && position && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[110] w-66 bg-card border border-border rounded-card shadow-xl p-3"
          style={{ top: position.top, left: position.left }}
        >
          <MonthCalendar
            viewYear={viewYear}
            viewMonth={viewMonth}
            selected={selected}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onSelectDay={selectDay}
          />
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <Clock className="w-3.5 h-3.5 text-muted shrink-0" />
            <input
              type="time"
              value={timePart || "12:00"}
              onChange={(e) => changeTime(e.target.value)}
              className="flex-1 h-8 px-2 text-[13px] bg-surface border border-border rounded-md outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all text-foreground"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!selected}
              className="h-8 px-3 text-[12px] font-semibold bg-brand text-brand-foreground rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
