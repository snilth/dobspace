export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SidebarWrapper } from "@/components/shared/sidebar-wrapper";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarWrapper />
      <main className="flex-1 overflow-y-auto bg-surface">{children}</main>
    </div>
  );
}
