import { createServerCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssignmentList } from "./assignment-list";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trpc = await createServerCaller();

  let course;
  try {
    course = await trpc.courses.get({ id });
  } catch {
    notFound();
  }

  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="flex items-center gap-3 px-6 h-[54px] border-b border-border bg-card flex-shrink-0">
        <Link
          href="/courses"
          className="flex items-center justify-center w-7 h-7 rounded-[8px] text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: course.color }}>
          <span className="text-[13px] font-bold text-white/80">{course.name[0]?.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-foreground text-[14px] truncate">{course.name}</span>
          <span className="text-[12px] text-muted flex-shrink-0">{course.term}</span>
        </div>
      </div>

      <div className="flex-1 p-6">
        <AssignmentList courseId={course.id} initialAssignments={course.assignments} />
      </div>
    </div>
  );
}
