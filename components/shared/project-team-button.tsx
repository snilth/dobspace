"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { InviteModal } from "./invite-modal";

type Props = {
  workspaceId: string;
  workspaceName: string;
  projectId: string;
  projectName: string;
  joinCode?: string | null;
  canManage?: boolean;
};

export function ProjectTeamButton({ workspaceId, workspaceName, projectId, projectName, joinCode, canManage }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
      >
        <Users className="w-4 h-4" />
        Team
      </button>
      {open && (
        <InviteModal
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          projectId={projectId}
          projectName={projectName}
          initialJoinCode={joinCode}
          canManage={canManage}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
