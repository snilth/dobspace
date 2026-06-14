"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AssignmentType, Priority } from "@prisma/client";
import { useTRPC } from "@/lib/trpc/client";
import { AssignmentBoard } from "./assignment-board";
import { AssignmentModal } from "./assignment-modal";

export type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date;
  reminder: string | null;
  type: AssignmentType;
  priority: Priority;
  done: boolean;
};

export const TYPE_LABEL: Record<AssignmentType, string> = {
  HOMEWORK: "Homework",
  EXAM: "Exam",
  QUIZ: "Quiz",
  MINI_PROJECT: "Mini Project",
};

export const PRIORITY_LABEL: Record<Priority, string> = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

function sortAssignments(list: Assignment[]) {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export function AssignmentList({ courseId, initialAssignments }: { courseId: string; initialAssignments: Assignment[] }) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [editing, setEditing] = useState<Assignment | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const toggleDone = useMutation(trpc.assignments.toggleDone.mutationOptions({
    onSuccess: (updated) => {
      setAssignments((prev) => sortAssignments(prev.map((a) => (a.id === updated.id ? { ...a, done: updated.done } : a))));
      queryClient.invalidateQueries({ queryKey: trpc.courses.list.queryKey() });
    },
  }));

  function handleCreated(created: Assignment) {
    setAssignments((prev) => sortAssignments([...prev, created]));
  }

  function handleSaved(updated: Assignment) {
    setAssignments((prev) => sortAssignments(prev.map((a) => (a.id === updated.id ? updated : a))));
    setEditing(null);
  }

  function handleDeleted(id: string) {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <AssignmentBoard
        courseId={courseId}
        assignments={assignments}
        onToggle={(id, done) => toggleDone.mutate({ id, done })}
        onEdit={setEditing}
        onCreated={handleCreated}
      />

      {editing && (
        <AssignmentModal
          assignment={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
