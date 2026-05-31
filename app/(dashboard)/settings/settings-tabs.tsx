"use client";

import { useState } from "react";
import { UserCircle2, Building2, Bell, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountSection } from "./account-section";
import { WorkspaceSection } from "./workspace-section";
import { NotificationSection } from "./notification-section";
import { PreferenceSection } from "./preference-section";

const TABS = [
  { id: "account",       label: "My Account",   icon: UserCircle2 },
  { id: "workspace",     label: "Workspace",     icon: Building2   },
  { id: "notifications", label: "Notifications", icon: Bell        },
  { id: "preferences",   label: "Preferences",   icon: Paintbrush  },
] as const;

type TabId = typeof TABS[number]["id"];

type Member = {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  projects: { id: string; name: string; permission: string }[];
};

type Props = {
  name: string;
  email: string;
  image?: string | null;
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  members: Member[];
  currentUserId: string;
  notifPrefs: object;
};

export function SettingsTabs({
  name, email, image,
  workspaceId, workspaceName, isOwner, members, currentUserId,
  notifPrefs,
}: Props) {
  const [active, setActive] = useState<TabId>("account");

  return (
    <div className="flex min-h-[480px] gap-0">
      {/* Sidebar */}
      <aside className="w-[200px] flex-shrink-0 border-r border-border pr-3">
        <nav className="space-y-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-left transition-colors",
                active === tab.id
                  ? "bg-brand-subtle text-brand"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 pl-8 pt-0.5 min-w-0">
        {active === "account" && (
          <AccountSection name={name} email={email} image={image} />
        )}
        {active === "workspace" && (
          <WorkspaceSection
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            isOwner={isOwner}
            members={members}
            currentUserId={currentUserId}
          />
        )}
        {active === "notifications" && (
          <NotificationSection workspaceId={workspaceId} initial={notifPrefs as any} />
        )}
        {active === "preferences" && (
          <PreferenceSection />
        )}
      </main>
    </div>
  );
}
