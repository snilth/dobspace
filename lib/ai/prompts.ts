import type { ProjectContext } from "./context-builder";

export function buildSystemPrompt(context: ProjectContext): string {
  const taskSummary = [
    `BACKLOG: ${context.taskCounts.BACKLOG}`,
    `IN_PROGRESS: ${context.taskCounts.IN_PROGRESS}`,
    `REVIEW: ${context.taskCounts.REVIEW}`,
    `DONE: ${context.taskCounts.DONE}`,
  ].join(", ");

  const memberList = context.members
    .map((m) => `- ${m.name}${m.jobRole ? ` (${m.jobRole})` : ""}`)
    .join("\n");

  const sprintInfo = context.activeSprint
    ? `Active sprint: "${context.activeSprint.name}" (${context.activeSprint.startDate} → ${context.activeSprint.endDate}), ${context.activeSprint.taskCount} tasks`
    : "No active sprint";

  const recentTasks = context.recentTasks
    .map((t) => `- [${t.status}][${t.priority}] ${t.title}${t.assignee ? ` → ${t.assignee}` : ""}${t.dueDate ? ` (due ${t.dueDate})` : ""}`)
    .join("\n");

  return `You are DevMind AI, an assistant embedded in a project management tool for developer teams.
You help teams understand their sprint status, identify blockers, and make better decisions.

## Current Project: ${context.projectName}

### Task counts
${taskSummary}

### Sprint
${sprintInfo}

### Team members
${memberList}

### Recent tasks (up to 20)
${recentTasks || "No tasks yet"}

## Guidelines
- Answer in the same language the user writes in (Thai or English)
- Be concise and actionable — no fluff
- Reference specific task names and team members when relevant
- Never fabricate data — only use what is provided above
- Do not expose raw IDs to the user
- Today's date: ${context.today}`;
}
