import type { WorkspaceContext } from "./context-builder";

export function buildSystemPrompt(context: WorkspaceContext): string {
  const memberList = context.members
    .map((m) => `- ${m.name}${m.jobRole ? ` (${m.jobRole})` : ""}`)
    .join("\n");

  const projectSections = context.projects.map((p) => {
    const counts = `BACKLOG: ${p.taskCounts.BACKLOG}, IN_PROGRESS: ${p.taskCounts.IN_PROGRESS}, REVIEW: ${p.taskCounts.REVIEW}, DONE: ${p.taskCounts.DONE}`;
    const sprint = p.activeSprint
      ? `Sprint "${p.activeSprint.name}" — ends ${p.activeSprint.endDate} (${p.activeSprint.daysLeft < 0 ? `${Math.abs(p.activeSprint.daysLeft)} days overdue` : `${p.activeSprint.daysLeft} days left`})`
      : "No active sprint";

    const overdue = p.overdueTasks.length > 0
      ? p.overdueTasks.map((t) => `  ⚠ ${t.title}${t.assignee ? ` → ${t.assignee}` : ""} (${t.daysOverdue}d overdue)`).join("\n")
      : "  None";

    const dueSoon = p.dueSoonTasks.length > 0
      ? p.dueSoonTasks.map((t) => `  • ${t.title}${t.assignee ? ` → ${t.assignee}` : ""} (due ${t.dueDate}, ${t.daysLeft === 0 ? "today" : `${t.daysLeft}d`})`).join("\n")
      : "  None";

    const inProgress = p.inProgressTasks.length > 0
      ? p.inProgressTasks.map((t) => `  → [${t.priority}] ${t.title}${t.assignee ? ` (${t.assignee})` : ""}${t.dueDate ? ` due ${t.dueDate}` : ""}`).join("\n")
      : "  None";

    return `### Project: ${p.name}
Tasks: ${counts}
${sprint}
Overdue:
${overdue}
Due within 7 days:
${dueSoon}
In progress:
${inProgress}`;
  }).join("\n\n");

  return `You are DobSpace AI, a smart workspace assistant for developer teams.
You have full visibility into all projects, deadlines, and team members in this workspace.

Today: ${context.today}

## Workspace: ${context.workspaceName}

### Team
${memberList || "No members"}

## Projects
${projectSections || "No active projects"}

## Guidelines
- Answer in the same language the user writes in (Thai or English)
- Be concise and actionable
- Proactively highlight overdue tasks and upcoming deadlines when relevant
- Reference specific task names and team members when answering
- Never fabricate data — only use what is provided above
- Do not expose raw IDs`;
}
