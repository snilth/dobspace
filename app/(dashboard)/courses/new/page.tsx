"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight, GraduationCap, Check } from "lucide-react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { COURSE_COLORS } from "../courses-list";

export default function NewCoursePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [color, setColor] = useState(COURSE_COLORS[0]);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createCourse = useMutation(
    trpc.courses.create.mutationOptions({
      onSuccess: (course) => {
        queryClient.invalidateQueries({ queryKey: trpc.courses.list.queryKey() });
        router.push(`/courses/${course.id}`);
      },
    })
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !term.trim() || createCourse.isPending) return;
    createCourse.mutate({ name: name.trim(), term: term.trim(), color });
  }

  return (
    <div className="min-h-screen bg-surface-2/40 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <Link
          href="/courses"
          className="flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground mb-6 transition-colors group w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Courses
        </Link>

        <div className="bg-card rounded-[16px] border border-border shadow-[0_4px_24px_-8px_oklch(0%_0_0/8%)] overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-surface-2/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-brand flex items-center justify-center shadow-sm shadow-brand/30">
              <GraduationCap className="w-4 h-4 text-brand-foreground" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground leading-none">New Course</h1>
              <p className="text-[11px] text-muted mt-0.5">Add a class you&apos;re taking this term</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Course name *</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Algorithms & Data Structures"
                maxLength={100}
                required
                className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-3 focus:ring-brand/8 transition-all placeholder:text-muted-2"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Term *</label>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. Fall 2026"
                maxLength={50}
                required
                className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-3 focus:ring-brand/8 transition-all placeholder:text-muted-2"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Color</label>
              <div className="flex items-center gap-2">
                {COURSE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ background: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            {createCourse.error && (
              <div className="flex items-center gap-2 text-xs text-error bg-[oklch(97%_0.03_27)] border border-[oklch(88%_0.08_27)] rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                Something went wrong. Try again.
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || !term.trim() || createCourse.isPending}
              className="w-full h-10 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-brand/20"
            >
              {createCourse.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowRight className="w-4 h-4" />
              }
              Create Course
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
