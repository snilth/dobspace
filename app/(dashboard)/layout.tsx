export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SidebarWrapper } from "@/components/shared/sidebar-wrapper";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarWrapper />
      <main className="flex-1 overflow-y-auto bg-surface">{children}</main>
    </div>
  );
}
