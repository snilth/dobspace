# DevMind — Progress Log

_อัปเดตล่าสุด: 30 พ.ค. 2026_

---

## สถานะโดยรวม

| Phase | ชื่อ                                   | สถานะ   |
| ----- | ------------------------------------ | ------- |
| 1     | Foundation                           | ✅ เสร็จ  |
| 2     | Core App (Kanban + CRUD)             | ✅ เสร็จ  |
| 3     | Realtime (Socket.io + Notifications) | ✅ เสร็จ  |
| 4     | AI Chatbot (Claude streaming)        | ✅ เสร็จ  |
| 5     | Dashboard (KPI + Burndown)           | ✅ เสร็จ  |

---

## Phase 1 — Foundation ✅

### สิ่งที่ทำเสร็จ

- **Docker Compose** — PostgreSQL 17-alpine (`devmind-postgres`) + Redis 8-alpine (`devmind-redis`)
- **Prisma v7.8** — Schema ครบ: Better Auth models (User, Session, Account, Verification) + App models (Workspace, WorkspaceMember, InviteToken, Project, Sprint, Task, Notification)
  - ใช้ `prisma.config.ts` (Prisma v7 ไม่มี `url` ใน schema แล้ว)
  - ใช้ `@prisma/adapter-pg` (driver adapter pattern)
- **Better Auth v1.6** — email/password auth, RBAC, `databaseHooks` bootstrap workspace อัตโนมัติเมื่อ user แรก register
- **tRPC v11** — `publicProcedure`, `protectedProcedure`, `adminProcedure`, routers: workspace / projects / tasks / notifications
- **lib/env.ts** — Zod env validation
- **kysely pinned @ 0.28.17** — 0.29.x breaks `@better-auth/kysely-adapter`

### Endpoints / Routes
- `GET /` → redirect to `/dashboard` หรือ `/login`
- `POST /api/auth/*` — Better Auth handler
- `POST /api/trpc/*` — tRPC handler

---

## Phase 2 — Core App ✅

### สิ่งที่ทำเสร็จ

- **Pages (App Router)**
  - `/login`, `/register` — Better Auth forms
  - `/dashboard` — overview page
  - `/projects` — list all projects
  - `/projects/new` — create project form
  - `/projects/[id]` — Kanban board page
- **Kanban Board** (`components/kanban/`)
  - `KanbanBoard` — DnD via `@dnd-kit`, 4 columns: BACKLOG / IN_PROGRESS / REVIEW / DONE
  - `KanbanColumn` — droppable zone, column header, task count badge
  - `TaskCard` — sortable card, shows priority, assignee avatar, due date, tags
  - `CreateTaskDialog` — modal form สร้าง task + callback pattern (ไม่ต้อง refresh)
- **tRPC Routers**
  - `tasks.list` — ดึง task ของ project
  - `tasks.create` — สร้าง task
  - `tasks.move` — เปลี่ยน status
  - `projects.list`, `projects.get`, `projects.create`
  - `workspace.get` — workspace info
  - `notifications.list`, `notifications.unreadCount`, `notifications.markRead`, `notifications.markAllRead`
- **Sidebar** — real session data, project list from DB, sign out

---

## Phase 3 — Realtime ✅

### สิ่งที่ทำเสร็จ

- **Custom Next.js Server** (`server.ts`) — ใช้ `tsx server.ts` แทน `next dev`
- **Socket.io v4** (`lib/socket/`)
  - `server.ts` — attach ไปกับ HTTP server, handle rooms (per-project, per-user)
  - `client.ts` — singleton socket, lazy require เพื่อหลีก SSR
  - `events.ts` — typed events: `task:moved`, `task:created`, `notification:new`
- **Realtime Kanban** — drag → emit `task:moved` → broadcast ไปทุก client ใน room เดียวกัน
- **Realtime Task Create** — สร้าง task → emit `task:created` → ปรากฏใน board ของ user อื่นทันที
- **Notification Bell** (`components/shared/notification-bell.tsx`)
  - badge แสดง unread count
  - dropdown panel พร้อม markRead / markAllRead
  - listen `notification:new` socket event → update badge realtime
- **hooks/use-socket.ts** — `useSocket()`, `useSocketEvent()` ป้องกัน SSR

### สถาปัตยกรรม Realtime
```
Client A drag task
  → setTasks (optimistic UI)
  → tRPC tasks.move (DB update)
  → socket.emit "task:moved"
    → Server broadcast to project room
      → Client B receives → setTasks
```

---

## Phase 4 — AI Chatbot ✅

### สิ่งที่ทำเสร็จ

- **`lib/ai/client.ts`** — Anthropic SDK ต่อ PSU endpoint (`https://ai.psu.blue/anthropic`)
- **`lib/ai/prompts.ts`** — `buildSystemPrompt()` inject project context (tasks, sprint, members, today's date)
- **`lib/ai/context-builder.ts`** — Prisma query สรุป project state → `ProjectContext`
- **`app/api/ai/chat/route.ts`** — SSE streaming endpoint, rate limit 20 req/min via Redis
- **`components/chat/chat-panel.tsx`** — real `fetch` + ReadableStream reader แทน mock, รองรับ abort

### AI Config

```
ANTHROPIC_BASE_URL=https://ai.psu.blue/anthropic
ANTHROPIC_API_KEY=sk-user-...
AI_MODEL=deepseek/deepseek-chat
```

ใช้ PSU university endpoint (Anthropic-compatible, ฟรี) — model จริงคือ DeepSeek Chat

---

## Phase 5 — Dashboard ✅

### สิ่งที่ทำเสร็จ

- **`lib/trpc/routers/dashboard.ts`** — query KPIs, progress per project, workload per member, recent activity
- **`app/(dashboard)/dashboard/page.tsx`** — rebuild เต็มรูปแบบ:
  - KPI cards 4 ใบ: งานทั้งหมด / กำลังทำ / เสร็จแล้ว / เกิน due date
  - Progress bar ต่อ project (เสร็จ + กำลังทำ สีแยกกัน)
  - Workload ทีม: bar แสดง task ที่ค้างต่อคน
  - กิจกรรมล่าสุด: 10 task ที่ update ล่าสุด พร้อม status + priority + เวลา
- **`components/shared/sidebar-wrapper.tsx`** — Client Component wrapper สำหรับ `dynamic(..., { ssr: false })` แก้ปัญหา `useSession` ถูก render server-side

---

## Stack Summary

| ส่วน          | เทคโนโลยี                     | เวอร์ชัน   |
| ------------ | ---------------------------- | -------- |
| Frontend     | Next.js                      | 16.2.6   |
| UI Framework | React                        | 19.2.4   |
| Styling      | Tailwind CSS                 | v4       |
| Type System  | TypeScript                   | 5 strict |
| API          | tRPC                         | v11.17   |
| Auth         | Better Auth                  | v1.6     |
| ORM          | Prisma                       | v7.8     |
| Database     | PostgreSQL                   | 17       |
| Cache        | Redis                        | 8        |
| Realtime     | Socket.io                    | v4       |
| DnD          | @dnd-kit                     | latest   |
| AI           | Anthropic SDK (PSU endpoint) | —        |

---

## ไฟล์สำคัญ

| ไฟล์                                       | หน้าที่                                          |
| ----------------------------------------- | --------------------------------------------- |
| `prisma/schema.prisma`                    | Schema ทั้งหมด                                  |
| `prisma.config.ts`                        | Prisma v7 config (DATABASE_URL)               |
| `lib/db/prisma.ts`                        | PrismaClient singleton + PrismaPg adapter     |
| `lib/auth/index.ts`                       | Better Auth config + workspace bootstrap hook |
| `lib/trpc/router.ts`                      | Root tRPC router                              |
| `lib/socket/server.ts`                    | Socket.io server init                         |
| `lib/socket/events.ts`                    | Typed socket events                           |
| `server.ts`                               | Custom Next.js + Socket.io server             |
| `components/kanban/kanban-board.tsx`      | Kanban DnD + realtime                         |
| `components/chat/chat-panel.tsx`          | AI chat UI (ยังเป็น mock)                       |
| `components/shared/notification-bell.tsx` | Realtime notification bell                    |

---

## Known Issues / Tech Debt

- ไม่มี invite flow UI ยังเขียนแค่ schema (InviteToken) — post-MVP
- ไม่มี Sprint UI — tasks ทุกตัวอยู่ใน backlog column ก่อน
- Test coverage ยังเป็น 0% — จะเพิ่มหลัง Phase 5
