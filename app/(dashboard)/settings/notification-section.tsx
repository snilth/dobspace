"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Section } from "./account-section";

type EventTypes = {
  assigned: boolean;
  status_changed: boolean;
  priority_changed: boolean;
  due_date_changed: boolean;
  commented: boolean;
  mentioned: boolean;
};

type DeadlineApproaching = { enabled: boolean; hoursBefore: number };
type DeadlineOverdue = { enabled: boolean; interval: "once" | "daily" };

type NotifPref = {
  workspaceId: string;
  eventTypes: EventTypes | unknown;
  deadlineApproaching: DeadlineApproaching | unknown;
  deadlineOverdue: DeadlineOverdue | unknown;
};

type Props = { workspaceId: string; initial: NotifPref };

const EVENT_LABELS: Record<keyof EventTypes, string> = {
  assigned: "Task assigned to you",
  status_changed: "Task status changed",
  priority_changed: "Task priority changed",
  due_date_changed: "Due date changed",
  commented: "Comment on your task",
  mentioned: "Someone mentioned you (@mention in notes)",
};

const COMING_SOON: Set<keyof EventTypes> = new Set(["commented"]);

const HOURS_OPTIONS = [
  { value: 2, label: "2 hours" },
  { value: 6, label: "6 hours" },
  { value: 24, label: "1 day" },
  { value: 48, label: "2 days" },
  { value: 72, label: "3 days" },
];

export function NotificationSection({ workspaceId, initial }: Props) {
  const defaultEvents: EventTypes = {
    assigned: true, status_changed: true, priority_changed: true,
    due_date_changed: true, commented: true, mentioned: true,
  };
  const defaultApproaching: DeadlineApproaching = { enabled: true, hoursBefore: 24 };
  const defaultOverdue: DeadlineOverdue = { enabled: true, interval: "daily" };

  const [events, setEvents] = useState<EventTypes>({
    ...defaultEvents,
    ...(initial.eventTypes as Partial<EventTypes>),
  });
  const [approaching, setApproaching] = useState<DeadlineApproaching>({
    ...defaultApproaching,
    ...(initial.deadlineApproaching as Partial<DeadlineApproaching>),
  });
  const [overdue, setOverdue] = useState<DeadlineOverdue>({
    ...defaultOverdue,
    ...(initial.deadlineOverdue as Partial<DeadlineOverdue>),
  });

  const trpc = useTRPC();
  const update = useMutation(trpc.notificationPreference.update.mutationOptions({
    onError: () => {
      // Rollback on failure — reload preferences from server on next visit
      // For now just reset to initial values
      setEvents({ ...defaultEvents, ...(initial.eventTypes as Partial<EventTypes>) });
      setApproaching({ ...defaultApproaching, ...(initial.deadlineApproaching as Partial<DeadlineApproaching>) });
      setOverdue({ ...defaultOverdue, ...(initial.deadlineOverdue as Partial<DeadlineOverdue>) });
    },
  }));

  function toggleEvent(key: keyof EventTypes) {
    const prev = events[key];
    const next = { ...events, [key]: !prev };
    setEvents(next);
    update.mutate({ workspaceId, eventTypes: next }, {
      onError: () => setEvents(e => ({ ...e, [key]: prev })),
    });
  }

  function updateApproaching(patch: Partial<DeadlineApproaching>) {
    const next = { ...approaching, ...patch };
    setApproaching(next);
    update.mutate({ workspaceId, deadlineApproaching: next }, {
      onError: () => setApproaching(approaching),
    });
  }

  function updateOverdue(patch: Partial<DeadlineOverdue>) {
    const next = { ...overdue, ...patch };
    setOverdue(next);
    update.mutate({ workspaceId, deadlineOverdue: next }, {
      onError: () => setOverdue(overdue),
    });
  }

  return (
    <Section title="Notifications" description="Choose which events to be notified about">
      {/* Event toggles */}
      <div className="pb-5 mb-5 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-foreground-2">Task activity</p>
          {update.isError && <span className="text-[10px] text-error">Failed to save</span>}
        </div>
        <div className="space-y-2">
          {(Object.keys(EVENT_LABELS) as (keyof EventTypes)[]).map((key) => (
            COMING_SOON.has(key) ? (
              <div key={key} className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-muted">{EVENT_LABELS[key]}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-3 text-muted-2">Coming soon</span>
              </div>
            ) : (
              <Toggle
                key={key}
                label={EVENT_LABELS[key]}
                checked={events[key]}
                onChange={() => toggleEvent(key)}
                disabled={update.isPending}
              />
            )
          ))}
        </div>
      </div>

      {/* Deadline approaching */}
      <div className="pb-5 mb-5 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-foreground">Deadline approaching</p>
            <p className="text-[11px] text-muted mt-0.5">Notify before deadline</p>
          </div>
          <ToggleSwitch checked={approaching.enabled} onChange={(v) => updateApproaching({ enabled: v })} />
        </div>
        {approaching.enabled && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted">Notify</p>
            <select
              value={approaching.hoursBefore}
              onChange={(e) => updateApproaching({ hoursBefore: Number(e.target.value) })}
              className="h-8 px-2 text-xs border border-border rounded-[6px] bg-card outline-none focus:border-brand/50 text-foreground"
            >
              {HOURS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted">before</p>
          </div>
        )}
      </div>

      {/* Deadline overdue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-foreground">Overdue tasks</p>
            <p className="text-[11px] text-muted mt-0.5">Notify when tasks are overdue</p>
          </div>
          <ToggleSwitch checked={overdue.enabled} onChange={(v) => updateOverdue({ enabled: v })} />
        </div>
        {overdue.enabled && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted">Frequency:</p>
            {(["once", "daily"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateOverdue({ interval: opt })}
                className={cn(
                  "px-3 h-7 text-xs font-medium rounded-md border transition-colors",
                  overdue.interval === opt
                    ? "bg-brand text-brand-foreground border-brand"
                    : "bg-card text-foreground-2 border-border hover:bg-surface-2"
                )}
              >
                {opt === "once" ? "Once" : "Daily"}
              </button>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={cn("text-[13px]", disabled ? "text-muted" : "text-foreground")}>{label}</span>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0",
        checked ? "bg-brand" : "bg-surface-3 border border-border-strong",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className={cn(
        "absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );
}
