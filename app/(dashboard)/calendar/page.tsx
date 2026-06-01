import { createServerCaller } from "@/lib/trpc/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const trpc = await createServerCaller();
  const { workspace } = await trpc.workspace.getCurrent();

  return (
    <div className="h-full flex flex-col">
      <CalendarView workspaceId={workspace.id} />
    </div>
  );
}
