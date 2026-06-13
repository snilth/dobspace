# Dashboard Overview — Visual Polish Design Spec

Date: 2026-06-13

## Summary

Visual-only polish pass on the dashboard overview page (`app/(dashboard)/dashboard/page.tsx`) and its 4 cards: `TaskSummary`, `ActivityTabs`, `TodoListCard`, `TeamCard`. Direction: "Bold Accent / Premium" — lean harder into the existing `--color-brand*` tokens for a more premium, Linear/Vercel-style dashboard feel. No data, prop, or layout-structure changes; pure Tailwind class edits on existing components.

---

## 1. Shared header treatment (all 4 cards)

Every card currently uses a bare muted icon + title with a flat `border border-border` around the whole card and a `border-b border-border` under the header.

New treatment:

- **Icon chip**: wrap the header icon in a colored chip — `w-6 h-6 rounded-btn bg-brand-subtle text-brand flex items-center justify-center`, icon itself stays `w-3.5 h-3.5`.
- **Top accent border**: replace the uniform `border border-border` with `border-t-[3px] border-t-brand border-x border-b border-border` — a colored top edge gives each card a "framed" look.

Applies identically to `TaskSummary`, `TeamCard`, `TodoListCard`, and `ActivityTabs`. All reuse existing `--color-brand` / `--color-brand-subtle` tokens — no new CSS variables.

---

## 2. TaskSummary

- "Total Tasks" becomes the hero stat: number rendered at `text-3xl` in `text-brand`, visually set apart from the other 5 (e.g. extra `gap`/border separator before the remaining stats).
- The other 5 stat numbers bump from `text-lg` to `text-xl`.
- Icon chips for each stat (already color-coded) increase from `w-7 h-7` to `w-8 h-8`.

---

## 3. TeamCard

- Workload bars: increase track height slightly and apply a brand-tinted track background (e.g. `bg-brand-subtle` instead of `bg-surface-3`) so the filled bar reads more clearly against it.
- Member list rows: no structural change — only inherit the new card header/border treatment from §1.

---

## 4. TodoListCard

- Inherits header chip + top accent border from §1.
- Filter pills (All/Active/Done): the active pill gets a subtle `shadow-sm` and slight `scale-[1.02]` for a "pressed/selected" premium feel.
- Add input, checkboxes, drag-to-reorder: unchanged.

---

## 5. ActivityTabs

- Inherits header chip + top accent border from §1.
- Active tab indicator changes from underline (`border-b-2`) to a filled pill: `bg-brand text-brand-foreground rounded-full px-3 py-1.5`, replacing the current `text-brand border-brand` underline style. Inactive tabs unchanged (`text-muted`, hover `text-foreground`).
- Pagination, list content, and data-fetching logic untouched.

---

## Architecture / Data Flow

No changes. All 4 components keep their existing props and data sources (`stats.kpi`, `stats.projectProgress`, `stats.recentActivity`, `stats.workload`, `members`, localStorage to-dos).

## Error Handling

N/A — styling-only change, no new failure modes.

## Testing

- `pnpm typecheck` to confirm no type regressions from class/markup edits.
- Manual visual check via dev server (light + dark mode, since `--color-brand*` differs per theme/accent).
