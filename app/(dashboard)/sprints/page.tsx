import { createServerCaller } from "@/lib/trpc/server";
import { AllSprintsView } from "@/components/sprint/all-sprints-view";

export default async function SprintsOverviewPage() {
  const trpc = await createServerCaller();
  const ws = await trpc.workspace.getCurrent();
  const workspaceId = ws.workspace.id;

  return <AllSprintsView workspaceId={workspaceId} />;
}
