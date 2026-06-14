# Perf note: N+1 query in assignment overdue check

**Status:** Not urgent — fine at current scale (handful of users/assignments).
Revisit if the overdue-assignment count starts growing into the hundreds.

## Where

`lib/jobs/assignment-deadline-check.ts`, the overdue loop (runs every 5 min via `server.ts`).

## Issue

The overdue query has no time bound — it keeps matching every undone,
past-due assignment forever (the list only grows until a user marks it
`done`). For each one, the loop does a separate `prisma.notification.findFirst`
to check whether an `ASSIGNMENT_DUE_OVERDUE` notification was already sent.

That's N+1 queries per run, every 5 minutes, indefinitely for any
assignment left overdue.

## Fix

Replace the per-assignment `findFirst` with a single batched query:

```ts
const existing = await prisma.notification.findMany({
  where: {
    type: "ASSIGNMENT_DUE_OVERDUE",
    dismissed: false,
    assignmentId: { in: overdue.map((a) => a.id) },
  },
  select: { assignmentId: true },
});
const alreadyNotified = new Set(existing.map((n) => n.assignmentId));
```

Then skip any assignment whose id is in `alreadyNotified`. Reduces the
overdue pass from N+1 queries to 2 regardless of how many assignments are
overdue.

Same pattern could apply to the "approaching" loop above it, though that
list is naturally bounded to assignments due within 24h.
