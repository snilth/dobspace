# Gantt Roadmap — Design Spec

Date: 2026-06-03

## Summary

Replace the Sprint feature with a per-project Gantt chart roadmap. Epics are the primary scheduling unit (draggable bars). Tasks are child bars under their Epic. Tasks without an Epic appear in an Unassigned section if they have a dueDate.

## Scope

- Replace `/projects/[id]/sprints` with `/projects/[id]/roadmap`
- Remove all Sprint UI, Sprint tRPC router, Sprint components
- Sprint model → Epic model (DB migration)
- No workspace-level roadmap in this iteration

---

## Data Model

### Epic (renamed from Sprint)

```prisma
model Epic {
  id        String   @id @default(cuid())
  projectId String
  name      String
  color     String   @default("#6366f1")
  startDate DateTime
  endDate   DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks   Task[]

  @@index([projectId])
}
```

Dropped from Sprint: `status`, `summary`, `summaryAt`, `SprintStatus` enum.

### Task changes

```prisma
model Task {
  // existing fields...
  startDate DateTime?   // NEW — required to render as bar on Gantt
  epicId    String?     // renamed from sprintId
  epic      Epic?       @relation(fields: [epicId], references: [id], onDelete: SetNull)
}
```

---

## Routes & Pages

| Old | New |
|-----|-----|
| `/projects/[id]/sprints` | `/projects/[id]/roadmap` |
| `/sprints` | removed |

Nav link updated from "Sprints" → "Roadmap".

---

## tRPC Routers

### `epics` router (new, replaces `sprint`)

- `epics.list({ projectId })` — returns all Epics with tasks
- `epics.create({ projectId, name, color, startDate, endDate })` — MANAGER only
- `epics.update({ id, name?, color?, startDate?, endDate? })` — MANAGER only (used by drag-to-reschedule)
- `epics.delete({ id })` — MANAGER only

### `tasks` router changes

- `tasks.update` accepts `startDate?: Date`, `epicId?: string | null`

---

## Components

### `GanttBoard`
- Renders timeline header (month/week columns) + scrollable body
- Computes date range from earliest Epic startDate to latest endDate (min 3 months shown)
- Two sections: Epics (with child tasks) + Unassigned (tasks with dueDate but no epicId)

### `GanttEpicRow`
- Epic bar: colored, full-width from startDate to endDate
- Draggable left/right (MANAGER only) → calls `epics.update` on drop
- Shows: Epic name, progress `done/total tasks`, date range
- Expand/collapse toggle to show/hide child GanttTaskRows
- Click on Epic name/edit icon → `EpicEditModal`

### `GanttTaskRow`
- Task bar: lighter shade of parent Epic color, from task.startDate to task.dueDate
- Read-only (no drag)
- Click → opens existing `TaskEditModal`
- Shows: task title, assignee avatar, priority dot
- Tasks without startDate shown as milestone diamond at dueDate

### `EpicCreateModal`
- Fields: name, color picker (preset swatches), startDate, endDate
- MANAGER only

### `EpicEditModal`
- Same fields as create + delete button
- MANAGER only

---

## Gantt Timeline

- X-axis: days, grouped by month header + week markers
- Minimum visible range: 3 months
- Auto-scroll to current date on load
- Time resolution: day-level (not hour)
- Pixel-per-day calculated from container width / visible days

---

## Drag-to-Reschedule (Epic only)

- Drag handle on Epic bar left/right
- Snaps to day boundaries
- Moves both startDate and endDate (preserves duration)
- Optimistic UI update → `epics.update` mutation
- On error: revert to original dates

---

## Permissions

| Action | VIEWER | EDITOR | MANAGER |
|--------|--------|--------|---------|
| View Gantt | ✓ | ✓ | ✓ |
| Drag Epic | ✗ | ✗ | ✓ |
| Create/Edit/Delete Epic | ✗ | ✗ | ✓ |
| Assign task to Epic | ✗ | ✓ | ✓ |

---

## Migration Plan

1. Prisma migration: rename `Sprint` table → `Epic`, drop `status`/`summary`/`summaryAt` columns, rename `sprintId` → `epicId` in `Task`, add `Task.startDate`, add `Epic.color`
2. Delete Sprint tRPC router → add Epic router
3. Delete Sprint components → add Gantt components
4. Update nav links and page routes
5. Remove `/sprints` workspace page

---

## Out of Scope

- Workspace-level roadmap across projects
- Dependencies/arrows between tasks
- Resource view
- Export to image/PDF
