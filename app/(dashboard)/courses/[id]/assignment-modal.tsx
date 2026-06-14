"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, Trash2, Check, AlertTriangle, Bell } from "lucide-react";
import type { AssignmentType, Priority } from "@prisma/client";
import { useTRPC } from "@/lib/trpc/client";
import { BlockNoteEditor } from "@/components/shared/block-note-editor";
import { type Assignment, TYPE_LABEL, PRIORITY_LABEL } from "./assignment-list";

function toDateInputValue(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export function AssignmentModal({ assignment, onClose, onSaved, onDeleted }: {
  assignment: Assignment;
  onClose: () => void;
  onSaved: (a: Assignment) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(assignment.dueDate));
  const [reminder, setReminder] = useState(assignment.reminder ?? "");
  const [type, setType] = useState<AssignmentType>(assignment.type);
  const [priority, setPriority] = useState<Priority>(assignment.priority);
  const [done, setDone] = useState(assignment.done);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const update = useMutation(trpc.assignments.update.mutationOptions());
  const toggleDone = useMutation(trpc.assignments.toggleDone.mutationOptions());
  const deleteAssignment = useMutation(trpc.assignments.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.courses.list.queryKey() });
      onDeleted(assignment.id);
    },
  }));

  const saving = update.isPending || toggleDone.isPending;
  const error = update.isError || toggleDone.isError;

  async function handleSave() {
    if (!title.trim() || !dueDate) return;
    try {
      const updated = await update.mutateAsync({
        id: assignment.id,
        data: {
          title: title.trim(),
          description: description.trim() || null,
          dueDate: new Date(dueDate).toISOString(),
          reminder: reminder.trim() || null,
          type,
          priority,
        },
      });
      let final = updated;
      if (done !== assignment.done) {
        final = await toggleDone.mutateAsync({ id: assignment.id, done });
      }
      queryClient.invalidateQueries({ queryKey: trpc.courses.list.queryKey() });
      onSaved({ ...final, dueDate: new Date(final.dueDate) });
    } catch {
      // error state surfaced via update.isError / toggleDone.isError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-card rounded-[16px] border border-border shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-foreground">Edit Assignment</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Title *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-3 focus:ring-brand/8 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Description</label>
            <BlockNoteEditor
              value={description}
              onChange={(md) => setDescription(md.slice(0, 2000))}
              placeholder="Optional notes... (try '/' for headings, lists, to-dos)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Due date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-3 focus:ring-brand/8 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssignmentType)}
                className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-3 focus:ring-brand/8 transition-all"
              >
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
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
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-3 focus:ring-brand/8 transition-all resize-none placeholder:text-muted-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-3 focus:ring-brand/8 transition-all"
              >
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 h-10 px-3 border border-border rounded-[8px] bg-surface cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setDone((d) => !d)}
                aria-pressed={done}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? "bg-brand border-brand" : "border-border"}`}
              >
                {done && <Check className="w-3 h-3 text-brand-foreground" strokeWidth={3} />}
              </button>
              <span className="text-sm text-foreground-2">Done</span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-error bg-[oklch(97%_0.03_27)] border border-[oklch(88%_0.08_27)] rounded-lg px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
              Something went wrong. Try again.
            </div>
          )}
        </div>

        {confirmDelete ? (
          <div className="px-5 py-4 border-t border-border bg-surface-2/50">
            <div className="flex items-start gap-2.5 mb-3">
              <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-foreground-2">Delete &quot;{assignment.title}&quot;? This cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 h-9 border border-border rounded-[8px] text-sm font-medium text-foreground-2 hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => deleteAssignment.mutate({ id: assignment.id })}
                disabled={deleteAssignment.isPending}
                className="flex-1 h-9 bg-error text-white rounded-[8px] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-1.5">
                {deleteAssignment.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-error hover:bg-[oklch(95%_0.03_27)] rounded-[8px] transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="h-9 px-4 border border-border rounded-[8px] text-sm font-medium text-foreground-2 hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || !dueDate || saving}
                className="h-9 px-4 bg-brand text-brand-foreground rounded-[8px] text-sm font-semibold hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
