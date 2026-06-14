import { createServerCaller } from "@/lib/trpc/server";
import { CalendarPageClient } from "@/components/calendar/calendar-page-client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const trpc = await createServerCaller();
  const { workspace } = await trpc.workspace.getCurrent();

  return (
    <div className="h-full flex flex-col">
      <CalendarPageClient workspaceId={workspace.id} />
    </div>
  );
}
