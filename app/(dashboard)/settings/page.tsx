import { createServerCaller } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { Settings } from "lucide-react";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const trpc = await createServerCaller();
  const session = await getSession();

  const { workspace, isOwner } = await trpc.workspace.getCurrent();
  const [members, notifPrefs] = await Promise.all([
    trpc.workspace.membersWithProjects({ workspaceId: workspace.id }),
    trpc.notificationPreference.get({ workspaceId: workspace.id }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-xs font-medium text-muted mb-1 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" />
          Settings
        </p>
        <h1 className="text-[22px] font-bold text-foreground leading-none">Settings</h1>
      </div>

      <SettingsTabs
        name={session?.user.name ?? ""}
        email={session?.user.email ?? ""}
        image={session?.user.image ?? null}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        isOwner={isOwner}
        members={members}
        currentUserId={session?.user.id ?? ""}
        notifPrefs={notifPrefs}
      />
    </div>
  );
}
