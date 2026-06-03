# Workspace Roadmap — Design Spec

Date: 2026-06-03

## Summary

A workspace-level Gantt chart at `/roadmap` showing all projects the user belongs to. Three-level hierarchy: Project → Epic → Task. Each project renders a spanning bar plus its epics and tasks beneath it. Reuses existing Gantt components (`GanttEpicRow`, `GanttTaskRow`, `gantt-utils`).

---

## Route & Navigation

- **Page**: `app/(dashboard)/roadmap/page.tsx`
- **Sidebar**: New nav item "Roadmap" with `Map` icon, between Calendar and Settings
- **URL**: `/roadmap`

---

## Data

### New tRPC endpoint: `epic.listAll({ workspaceId })`

Returns all projects the user is a member of (or owns), each with their epics and tasks:

```ts
{
  projects: [{
    id: string
    name: string
    epics: [{
      id, name, color, startDate, endDate,
      tasks: [{ id, title, status, priority, startDate, dueDate, assignees }]
    }]
  }]
}
```

Logic mirrors `projects.listMine` permission check: workspace owner sees all projects; members see only projects they belong to.

---

## Components

### `WorkspaceGanttBoard`

- Fetches `epic.listAll({ workspaceId })`
- Computes date range across ALL epics in ALL projects
- Renders shared timeline header (month row + day row) — reuses existing logic
- Renders one `GanttProjectRow` per project
- Skeleton loading state (same pattern as `GanttBoard`)
- No "New Epic" button (epics are managed per-project)

### `GanttProjectRow` (new)

- **Label column**: Project icon (first letter) + project name + epic count badge. Collapse/expand chevron.
- **Bar**: Neutral grey (`oklch(70% 0.005 258)`), spans `min(epic.startDate)` → `max(epic.endDate)` across all epics. Height slightly taller than epic bars (10px).
- **Empty state**: If project has no epics, show label only — no bar, no child rows.
- **Collapse**: Hides all `GanttEpicRow` and `GanttTaskRow` children. Project bar always visible.
- No edit/delete on project row.

### Reused unchanged

- `GanttEpicRow` — same as per-project Gantt, pencil edit disabled (read-only on workspace view)
- `GanttTaskRow` — same, pencil edit opens `TaskEditModal` as usual
- `gantt-utils.ts` — `computeDateRange`, `getMonthGroups`, `getDayColumns`, etc.

---

## Permissions

| Action | Any member |
|--------|-----------|
| View workspace roadmap | ✓ (own projects only) |
| Edit epic (pencil) | ✗ (read-only on this page) |
| Edit task dates | ✓ (via TaskEditModal) |

Epic editing is intentionally disabled on the workspace roadmap — users edit epics from the per-project `/projects/[id]/roadmap` page.

---

## Label Column Hierarchy

```
▾ 🟦 Vivi's Project          3 epics
    ▾ Test V1 ·Jun 1–Jun 30   ████████████
        backlog 1  Jun 5      ░░░░░
    ▾ Test V2 ·Jun 5–Jun 12   ██████
▾ 🟩 Another Project          1 epic
    ▾ Feature  ·Jul 1–Aug 15  ██████████████
```

Project row label width = same `LABEL_WIDTH` (220px).
Epic row indented (same as current, pl-4).
Task row indented further (same as current, pl-10).

---

## Out of Scope

- Creating/editing epics from workspace roadmap
- Filtering by project or date range
- Export to image/PDF
- Drag to reschedule from workspace view
