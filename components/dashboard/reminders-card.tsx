"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { Bell, Plus, X } from "lucide-react";

type ReminderAssignment = {
  id: string;
  title: string;
  reminder: string | null;
  dueDate: Date;
  course: { id: string; name: string; color: string };
};

function fmtRemindAt(d: Date | string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function RemindersCard({ assignments }: { assignments: ReminderAssignment[] }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [remindAt, setRemindAt] = useState("");

  const { data: reminders = [] } = useQuery(trpc.reminders.list.queryOptions());

  const createReminder = useMutation(
    trpc.reminders.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.reminders.list.queryKey() });
        setText("");
        setRemindAt("");
      },
    })
  );

  const deleteReminder = useMutation(
    trpc.reminders.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.reminders.list.queryKey() });
      },
    })
  );

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !remindAt) return;
    createReminder.mutate({ text: text.trim(), remindAt: new Date(remindAt).toISOString() });
  }

  const hasAny = reminders.length > 0 || assignments.length > 0;

  return (
    <div className="bg-card rounded-card border-t-[3px] border-t-brand border-x border-b border-border p-4 shadow-[0_1px_4px_oklch(0%_0_0/4%)] flex flex-col lg:flex-1 lg:min-h-0">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <div className="w-6 h-6 rounded-btn bg-brand-subtle text-brand flex items-center justify-center">
          <Bell className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-[13px] font-semibold text-foreground">Reminders</h2>
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-2 mb-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Remind me to..."
          className="flex-1 min-w-0 text-[13px] px-3 py-2 rounded-full border border-border bg-surface-2 placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          className="text-[12px] px-2 py-2 rounded-full border border-border bg-surface-2 text-foreground-2 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <button
          type="submit"
          disabled={!text.trim() || !remindAt || createReminder.isPending}
          aria-label="Add reminder"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-brand text-brand-foreground hover:bg-brand-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {!hasAny ? (
        <p className="text-[13px] text-muted text-center py-6">No reminders set yet.</p>
      ) : (
        <ul className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 -mr-1 lg:max-h-none lg:flex-1 lg:min-h-0">
          {reminders.map((r) => (
            <li key={r.id} className="group flex items-start gap-2 p-2.5 rounded-btn border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground mb-0.5">{r.text}</p>
                <p className="text-[11px] text-muted-2">{fmtRemindAt(r.remindAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteReminder.mutate({ id: r.id })}
                aria-label="Delete reminder"
                className="w-5 h-5 flex items-center justify-center rounded-full text-muted-2 opacity-0 group-hover:opacity-100 hover:text-error hover:bg-error/10 transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
          {assignments.map((a) => (
            <li key={a.id}>
              <Link
                href={`/courses/${a.course.id}`}
                className="block p-2.5 rounded-btn border border-border hover:border-brand/30 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.course.color }} />
                  <span className="text-[11px] font-medium text-muted truncate">{a.course.name}</span>
                  <span className="text-[11px] text-muted-2 ml-auto shrink-0">
                    {new Date(a.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-foreground truncate mb-0.5">{a.title}</p>
                <p className="text-[12px] text-muted-2 line-clamp-2">{a.reminder}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
