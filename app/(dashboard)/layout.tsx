export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SidebarWrapper } from "@/components/shared/sidebar-wrapper";
import { ChatPanel } from "@/components/chat/chat-panel";
import { createServerCaller } from "@/lib/trpc/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const trpc = await createServerCaller();
  const { workspace } = await trpc.workspace.getCurrent().catch(() => ({ workspace: null }));

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarWrapper />
      <main className="flex-1 overflow-y-auto bg-surface">{children}</main>
      {workspace && <ChatPanel workspaceId={workspace.id} />}
    </div>
  );
}
