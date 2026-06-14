import { createServerCaller } from "@/lib/trpc/server";
import { CoursesList } from "./courses-list";

export default async function CoursesPage() {
  const trpc = await createServerCaller();
  const courses = await trpc.courses.list();

  return <CoursesList initialCourses={courses} />;
}
