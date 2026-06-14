"use client";

import { useState } from "react";
import { X, Loader2, GraduationCap, Bell } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AssignmentType, Priority } from "@prisma/client";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { BlockNoteEditor } from "@/components/shared/block-note-editor";
import { type Assignment, TYPE_LABEL } from "./assignment-list";

const PRIORITY_OPTS = [
  { value: "LOW", label: "Low", color: "text-[oklch(42%_0.17_148)]", bg: "bg-[oklch(95%_0.05_148)] border-[oklch(85%_0.09_148)]", active: "bg-[oklch(90%_0.08_148)] border-[oklch(75%_0.12_148)]" },
  { value: "MEDIUM", label: "Medium", color: "text-[oklch(42%_0.18_55)]", bg: "bg-[oklch(96%_0.05_55)] border-[oklch(85%_0.09_55)]", active: "bg-[oklch(91%_0.08_55)] border-[oklch(75%_0.12_55)]" },
  { value: "HIGH", label: "High", color: "text-[oklch(42%_0.21_27)]", bg: "bg-[oklch(96%_0.05_27)] border-[oklch(85%_0.09_27)]", active: "bg-[oklch(91%_0.08_27)] border-[oklch(75%_0.12_27)]" },
] as const;

export function AssignmentCreateDialog({ courseId, type, onClose, onCreated }: {
  courseId: string;
  type: AssignmentType;
  onClose: () => void;
  onCreated: (a: Assignment) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [reminder, setReminder] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const create = useMutation(trpc.assignments.create.mutationOptions({
    onSuccess: (created) => {
      onCreated({ ...created, dueDate: new Date(created.dueDate) });
      queryClient.invalidateQueries({ queryKey: trpc.courses.list.queryKey() });
      onClose();
    },
  }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueDate || create.isPending) return;
    create.mutate({
      courseId,
      data: {
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        dueDate: new Date(dueDate).toISOString(),
        ...(reminder.trim() ? { reminder: reminder.trim() } : {}),
        type,
        priority,
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-card rounded-[16px] border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2/50">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-brand flex items-center justify-center overflow-hidden">
              <GraduationCap className="w-4 h-4 text-brand-foreground" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">New {TYPE_LABEL[type]}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 problem set"
              maxLength={200}
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">
              Description <span className="font-normal text-muted">(optional)</span>
            </label>
            <BlockNoteEditor
              value={description}
              onChange={(md) => setDescription(md.slice(0, 2000))}
              placeholder="Add details... (try '/' for headings, lists, to-dos)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-[8px] border transition-all",
                    priority === p.value ? `${p.active} ${p.color}` : `${p.bg} ${p.color} opacity-60 hover:opacity-100`
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-muted" />
              Reminder <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              placeholder="e.g. Bring calculator, review chapter 4..."
              maxLength={280}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-9 text-sm border border-border rounded-[8px] hover:bg-surface-2 transition-colors text-foreground-2 font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !dueDate || create.isPending}
              className="flex-1 h-9 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {create.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
