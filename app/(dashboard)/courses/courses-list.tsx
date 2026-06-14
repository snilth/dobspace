"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, ListChecks, Check, X, Loader2, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Course = {
  id: string;
  name: string;
  term: string;
  color: string;
  _count: { assignments: number };
};

export const COURSE_COLORS = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#14b8a6", // teal
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#a855f7", // purple
];

export function CoursesList({ initialCourses }: { initialCourses: Course[] }) {
  const [courses, setCourses] = useState(initialCourses);

  function handleUpdated(updated: Course) {
    setCourses((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  }

  function handleDeleted(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-xs font-medium text-muted mb-1 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            Courses
          </p>
          <h1 className="text-[22px] font-bold text-foreground leading-none">My Courses</h1>
          <p className="text-sm text-muted mt-1.5">
            <span className="font-medium text-foreground-2">{courses.length}</span> courses
          </p>
        </div>
        <Link
          href="/courses/new"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-all shadow-sm shadow-brand/20"
        >
          <Plus className="w-4 h-4" />
          New Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center bg-card rounded-[16px] border border-dashed border-border">
          <div className="w-12 h-12 rounded-2xl bg-brand-subtle flex items-center justify-center mb-3">
            <GraduationCap className="w-6 h-6 text-brand" />
          </div>
          <p className="text-[13px] font-semibold text-foreground mb-1">No courses yet</p>
          <p className="text-xs text-muted">Add your first course to start tracking assignments</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onUpdated={handleUpdated} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, onUpdated, onDeleted }: {
  course: Course;
  onUpdated: (c: Course) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(course.name);
  const [term, setTerm] = useState(course.term);
  const [color, setColor] = useState(course.color);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const update = useMutation(trpc.courses.update.mutationOptions({
    onSuccess: () => {
      onUpdated({ ...course, name: name.trim(), term: term.trim(), color });
      queryClient.invalidateQueries({ queryKey: trpc.courses.list.queryKey() });
      setEditing(false);
    },
  }));

  const deleteCourse = useMutation(trpc.courses.delete.mutationOptions({
    onSuccess: () => {
      onDeleted(course.id);
      queryClient.invalidateQueries({ queryKey: trpc.courses.list.queryKey() });
      setConfirmDelete(false);
    },
  }));

  function handleSave() {
    if (!name.trim() || !term.trim()) return;
    update.mutate({ id: course.id, data: { name: name.trim(), term: term.trim(), color } });
  }

  function handleCancel() {
    setName(course.name);
    setTerm(course.term);
    setColor(course.color);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col rounded-[14px] border border-brand/40 bg-card shadow-[0_0_0_3px_oklch(65%_0.18_228/8%)] overflow-hidden">
        <div className="h-20 flex items-center justify-center" style={{ background: color }}>
          <span className="text-4xl font-black text-white/25 select-none">{(name || course.name)[0]?.toUpperCase()}</span>
        </div>
        <div className="p-4 space-y-2.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
            maxLength={100}
            placeholder="Course name"
            className="w-full text-[13px] font-semibold bg-transparent border-b border-border pb-1.5 outline-none focus:border-brand/60 text-foreground placeholder:text-muted"
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
            maxLength={50}
            placeholder="Term, e.g. Fall 2026"
            className="w-full text-[12px] bg-transparent border-b border-border pb-1.5 outline-none focus:border-brand/60 text-muted placeholder:text-muted-2"
          />
          <div className="flex items-center gap-1.5 pt-1">
            {COURSE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ background: c }}
              >
                {color === c && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button onClick={handleCancel} className="flex items-center gap-1 px-2.5 h-7 text-[11px] font-medium rounded-[6px] border border-border text-muted hover:bg-surface-2 transition-colors">
              <X className="w-3 h-3" />Cancel
            </button>
            <button onClick={handleSave} disabled={!name.trim() || !term.trim() || update.isPending}
              className="flex items-center gap-1 px-2.5 h-7 text-[11px] font-semibold rounded-[6px] bg-brand text-brand-foreground hover:bg-brand-dark transition-colors disabled:opacity-50">
              {update.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col rounded-[14px] border border-border bg-card hover:border-brand/30 hover:shadow-[0_6px_20px_-4px_oklch(0%_0_0/12%)] transition-all overflow-hidden">
      <Link href={`/courses/${course.id}`} className="block">
        <div className="relative h-20 flex items-center justify-center overflow-hidden" style={{ background: course.color }}>
          <span className="text-4xl font-black text-white/25 select-none group-hover:scale-110 transition-transform duration-300">
            {course.name[0]?.toUpperCase()}
          </span>
        </div>
      </Link>

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={() => setEditing(true)}
          className="w-7 h-7 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          title="Edit course">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setConfirmDelete(true)}
          className="w-7 h-7 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-error/80 transition-colors"
          title="Delete course">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
          <div className="w-full max-w-sm bg-card rounded-[16px] border border-border shadow-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-[oklch(93%_0.04_27)] flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
            <h2 className="text-[15px] font-bold text-foreground mb-1">Delete &quot;{course.name}&quot;?</h2>
            <p className="text-[13px] text-muted mb-5">All assignments for this course will be permanently deleted and cannot be recovered.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 h-9 border border-border rounded-[8px] text-sm font-medium text-foreground-2 hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => deleteCourse.mutate({ id: course.id })}
                disabled={deleteCourse.isPending}
                className="flex-1 h-9 bg-error text-white rounded-[8px] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-1.5">
                {deleteCourse.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href={`/courses/${course.id}`} className="flex flex-col flex-1 p-4">
        <p className="text-[14px] font-semibold text-foreground group-hover:text-brand transition-colors mb-1 truncate">
          {course.name}
        </p>
        <p className={cn("text-[12px] flex-1", course.term ? "text-muted" : "text-muted-2 italic")}>
          {course.term || "No term"}
        </p>
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
          <ListChecks className="w-3 h-3 text-muted" />
          <span className="text-[11px] text-muted">{course._count.assignments} pending</span>
        </div>
      </Link>
    </div>
  );
}
