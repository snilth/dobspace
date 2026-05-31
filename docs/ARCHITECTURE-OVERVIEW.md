# DevMind — Architecture Overview

**สรุปภาพรวมระบบ + Tech Stack + หน้าที่แต่ละชิ้น**

**เขียนเมื่อ:** 30 พ.ค. 2026

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (User)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  React 19 Components + TypeScript                                        │
│  ├─ Pages: Login, Dashboard, Projects, Kanban Board                     │
│  ├─ State: TanStack Query (caching) + Socket.io (real-time)             │
│  └─ UI: shadcn/ui + Tailwind CSS v4 (styling)                           │
└──────────┬───────────────────────────────────────┬──────────────────────┘
           │ HTTPS                                 │ WebSocket
           │                                       │
        ┌──▼────────────────────────────────────┐  │
        │                                        │  │
        │  NEXT.JS 16 SERVER (Vercel)           │  │
        │  ├─ Frontend (Server Components)      │  │
        │  ├─ tRPC API Routes                   │  │
        │  ├─ Auth Routes (Better Auth)         │  │
        │  └─ Chat AI Routes (Claude stream)    │  │
        │                                        │  │
        └──┬─────────────────────────────────┬──┘  │
           │                                 │     │
           │                                 └─────┼──────┐
           │ SQL Query via Prisma            │     │
           │                                 │     │
        ┌──▼──────────────────────────┐  ┌──▼─────▼──────┐
        │  PostgreSQL 17              │  │ Socket.io     │
        │  ├─ Workspace (multi-tenant)│  │ (event hub)   │
        │  ├─ User + Auth tables      │  │ ├─ task:moved │
        │  ├─ Project + Task + Sprint │  │ ├─ member:new │
        │  ├─ Notification + ActivityLog│ │ └─ notification:alert
        │  └─ Indexes (performance)   │  │               │
        └──┬──────────────────────────┘  └───────┬───────┘
           │                                      │
           └──────────────┬───────────────────────┘
                          │
        ┌─────────────────▼──────────────────┐
        │   REDIS 8 (Caching + Queue)        │
        │   ├─ User sessions                 │
        │   ├─ Hot data (project list, etc)  │
        │   ├─ Bull job queue (cron alerts)  │
        │   └─ Real-time event cache         │
        └────────────────────────────────────┘

        ┌─────────────────────────────────────┐
        │  Anthropic Claude API               │
        │  ├─ Model: claude-sonnet-4          │
        │  ├─ Streaming responses (SSE)       │
        │  └─ Project context injection       │
        └─────────────────────────────────────┘
```

---

## 📦 Tech Stack — Component Breakdown

### 🎨 Frontend Layer (Browser)

| Layer | Technology | Role | ทำหน้าที่ |
|-------|-----------|------|----------|
| **Framework** | Next.js 16 | React runtime + Server Components | ดึงข้อมูล server-side ก่อนส่งลง client, ลดการ fetch ของ client |
| **Language** | TypeScript 5 (strict) | Type safety | ลด bugs ด้วยการ check types compile-time |
| **UI Library** | shadcn/ui | Pre-built components (Button, Input, Dialog) | ใช้ component จาก library แทนเขียนเอง (Radix UI base) |
| **Styling** | Tailwind CSS v4 + PostCSS | Utility-first CSS | เขียน class แทน CSS file เพื่อความเร็ว |
| **DnD (Kanban)** | @dnd-kit | Drag-and-drop library | ลากจากนลาก task ระหว่าง columns ของ Kanban board |
| **State Mgmt** | TanStack Query v5 | Server state caching | Cache API responses, auto-refetch เมื่อ invalidate, ลด API calls |
| **Real-time** | Socket.io client | WebSocket listener | ฟังเหตุการณ์จาก server (task moved, notification) แบบ real-time |

**Flow:** User action → tRPC call → Prisma query → DB → Response → TanStack cache + Socket broadcast

---

### ⚙️ Backend Layer (Next.js Server)

| Layer | Technology | Role | ทำหน้าที่ |
|-------|-----------|------|----------|
| **Server Runtime** | Node.js + tsx | JavaScript runtime | ประมวลผล API requests, database queries |
| **Custom Server** | server.ts (tsx) | HTTP + Socket.io bridge | ทำให้ socket.io ทำงานกับ Next.js dev/prod |
| **API Framework** | tRPC v11 | RPC + Type-safe endpoints | เรียก backend functions จาก frontend โดยได้ autocomplete + type checking |
| **Input Validation** | Zod v4 | Schema validation | ตรวจสอบ input ต่อก่อนใช้ (ป้องกัน XSS, SQL injection) |
| **Auth** | Better Auth v1 | Session management + OAuth | จัดการ login/register, session tokens, RBAC roles |
| **Database ORM** | Prisma v7.8 | Type-safe DB layer | Query DB ด้วย API แบบ type-safe แทน raw SQL |
| **Socket.io** | v4 | Real-time event broadcast | ส่ง events ไปยัง clients ในชุมชน (room) |
| **Job Queue** | Bull/BullMQ (future) | Async tasks + cron | ตั้งเวลาสำหรับ deadline alerts (cron jobs) |

**Flow:** Request → Better Auth (middleware) → tRPC router → Zod validation → Prisma query → response → Socket broadcast

---

### 💾 Database Layer

| Component | Technology | Role | ทำหน้าที่ |
|-----------|-----------|------|----------|
| **SQL Database** | PostgreSQL 17 | Primary data store | เก็บ workspace, projects, tasks, users, notifications |
| **Connection Adapter** | @prisma/adapter-pg | Driver adapter (Prisma v7 pattern) | ต่อ PostgreSQL ผ่าน native pg driver |
| **Schema** | Prisma Schema | Type-safe DB schema | Define tables, relations, indexes |
| **Migrations** | Prisma Migrate | Version control for schema | Track schema changes, rollback ได้ |
| **In-Memory Cache** | Redis 8 | Session + hot data cache | เก็บ session, cache project list, queue jobs |

**Data Model:**
```
Workspace (multi-tenant root)
  ├─ Project (per workspace)
  │   ├─ Sprint (planning period)
  │   │   └─ Task (work item)
  │   │       └─ TaskAssignee (who's assigned)
  │   └─ Tag (categorize tasks)
  ├─ WorkspaceMember (users in workspace)
  │   └─ JobRole (PM, Dev, QA)
  ├─ Notification (alerts to users)
  ├─ ActivityLog (audit trail of changes)
  └─ NotificationPreference (user settings)

User (global auth)
  ├─ Session (login token)
  └─ Account (email/password)
```

---

### 🔌 Integration Layer (Glue between Frontend & Backend)

| Component | Technology | Role | ทำหน้าที่ |
|-----------|-----------|------|----------|
| **API Protocol** | tRPC | End-to-end type safety | Frontend → Backend RPC calls w/ TypeScript inference |
| **Query Client** | TanStack Query | Client-side caching | Cache GET results, invalidate on mutation |
| **Realtime Hub** | Socket.io | WebSocket events | Broadcast changes: task:moved, task:created, notification:alert |
| **Event Schema** | typed events (events.ts) | Type-safe event structure | Ensure payload matches expected shape |

**Example Flow:**
```
User drags task in Kanban
  ↓
React state update (optimistic UI)
  ↓
tRPC call: tasks.move(taskId, newStatus)
  ↓
Backend: Prisma update + ActivityLog insert
  ↓
Socket.io broadcast: { type: "task:moved", taskId, newStatus, userId }
  ↓
Other clients: receive event + TanStack invalidate + re-render
```

---

### 🤖 AI Integration Layer

| Component | Technology | Role | ทำหน้าที่ |
|-----------|-----------|------|----------|
| **AI Provider** | Anthropic Claude | LLM for chat | ตอบคำถาม, สรุป sprints, ให้คำแนะนำ |
| **Model** | claude-sonnet-4-20250514 | Latest fast model | ประมวลผลข้อมูลโปรเจกต์ + user query |
| **Context Builder** | context-builder.ts | Dynamic prompt injection | ดึง task, sprint, members จาก DB → สร้าง system prompt |
| **Streaming** | Server-Sent Events (SSE) | Real-time response | ส่ง Claude output ทีละประโยค เนื่องจาก Claude ตอบช้า |
| **Endpoint** | /api/ai/chat | Next.js route handler | รับ user message → call Claude → stream response |

**Flow:**
```
User: "What's due tomorrow?"
  ↓
buildProjectContext() → Prisma: get tasks WHERE dueDate = tomorrow
  ↓
buildSystemPrompt() → Inject context + role
  ↓
Anthropic.messages.stream(system, user message)
  ↓
Response → forEach chunk: res.write(chunk) [SSE streaming]
  ↓
Client: ChatPanel receives chunks → append text real-time
```

---

### 🚀 Deployment & Infrastructure

| Component | Technology | Role | ทำหน้าที่ |
|-----------|-----------|------|----------|
| **Frontend Hosting** | Vercel | Next.js deployment | Deploy frontend + API routes auto |
| **Database** | Prisma Postgres or AWS RDS | Managed PostgreSQL | Backups, SSL, HA (high availability) |
| **Caching** | Redis Cloud or Upstash | Managed Redis | Session store, job queue in production |
| **Container** | Docker + Docker Compose | Local dev + production | Package app + dependencies, reproducible environment |
| **CI/CD** | GitHub Actions | Automated testing + deployment | Run tests, lint, deploy on push to main |
| **Monitoring** | Sentry + Datadog (future) | Error tracking + observability | Real-time alerts when errors occur |

---

## 🔄 Request-Response Cycle (End-to-End)

### Scenario: User creates a task

```
1. FRONTEND (React)
   ├─ User fills form: title, assignee, dueDate
   ├─ Click "Create"
   ├─ Call tRPC: tasks.create({ title, assigneeIds, dueDate })
   └─ Optimistic update: add task to UI (before server confirms)

2. TRANSPORT (tRPC + Network)
   ├─ Serialize params to JSON
   ├─ Send HTTPS POST to /api/trpc/tasks.create
   └─ Headers include auth token (Better Auth session)

3. BACKEND (Next.js Server)
   ├─ Better Auth middleware: verify session token
   ├─ tRPC router: invoke tasks.create procedure
   ├─ Zod validation: check input (title length, assignee IDs exist)
   └─ If invalid → return error to client

4. DATABASE (PostgreSQL)
   ├─ Prisma: INSERT Task { title, projectId, ... }
   ├─ Prisma: INSERT TaskAssignee { taskId, userId, assignedBy, ... }
   ├─ Prisma: INSERT ActivityLog { action: "created", changes: [...] }
   └─ Return inserted records

5. REALTIME BROADCAST (Socket.io)
   ├─ Server emits: { type: "task:created", task, assignees }
   ├─ To: all members in project room
   └─ Other clients receive + TanStack invalidate

6. CACHING (Redis)
   ├─ Invalidate: task list cache key
   ├─ Store: ActivityLog entry in cache (for quick access)
   └─ TTL: 5 min for dynamic data

7. RESPONSE (Back to Frontend)
   ├─ tRPC returns: { task, assignees, activityLog }
   ├─ TanStack Query: merge into cache
   ├─ React re-render: show task in list
   └─ Notification: badge +1 for assignees

8. ACTIVITY (What user sees)
   ├─ Optimistic UI disappears (now real data)
   ├─ Task appears in list
   ├─ Badge notification on assignee clients (real-time)
   └─ "Task created successfully" toast
```

---

## 📊 Data Flow Architecture

```
                    ┌─── USERS (Browser) ──┐
                    │                       │
      ┌─────────────┤  React Component      │
      │             │  + TanStack Query     │
      │             │  + Socket.io listener │
      │             └───────────────────────┘
      │
      ▼
  ┌─────────────────────────────────────┐
  │   tRPC Router + Better Auth         │
  │   (Input validation w/ Zod)         │
  │   ├─ Workspace routes               │
  │   ├─ Project routes                 │
  │   ├─ Task routes                    │
  │   ├─ Notification routes            │
  │   └─ AI chat route                  │
  └──┬─────────┬───────────┬────────────┘
     │         │           │
     ▼         ▼           ▼
  ┌──────────────────────────────────────┐
  │   PRISMA ORM                         │
  │   (Type-safe queries)                │
  │   └─ Resolves to SQL                 │
  └────────┬────────────────────────────┘
           │
           ▼
  ┌──────────────────────────────────────┐
  │   PostgreSQL 17                      │
  │   ├─ Primary data (workspace, tasks) │
  │   ├─ Indexes (performance)           │
  │   └─ Transactions (data consistency) │
  └──────────┬───────────────────────────┘
             │
             ├─────────────────────────────┐
             │                             │
             ▼                             ▼
        ┌─────────────┐          ┌──────────────────┐
        │  Redis      │          │  Socket.io       │
        │  ├─ Cache   │          │  ├─ Broadcast    │
        │  ├─ Session │          │  └─ Event hub    │
        │  └─ Queue   │          └──────────────────┘
        └─────────────┘                    │
                                           │
                      (Real-time)          │
                                 ┌─────────┴──────────┐
                                 │                    │
                                 ▼                    ▼
                            ┌─────────────┐    ┌─────────────┐
                            │ Client A    │    │ Client B    │
                            │ Re-render   │    │ Re-render   │
                            │ Show update │    │ Show update │
                            └─────────────┘    └─────────────┘
```

---

## 🎯 Each Technology's Responsibility

| Technology | ตัวอักษร | Responsibility | ไม่ทำ |
|-----------|---------|-----------------|------|
| **Next.js** | FE + BE | Render UI, API routes, SSR | Database operations (ให้ Prisma) |
| **React** | FE | Component rendering, state | Network requests (ให้ tRPC) |
| **TypeScript** | FE + BE | Type checking | Runtime validation (ให้ Zod) |
| **Tailwind** | FE | CSS styling | HTML structure (ให้ React) |
| **tRPC** | Bridge | RPC + type safety | Database queries (ให้ Prisma) |
| **Prisma** | BE | ORM, query building | Raw SQL (use `.raw()` if needed) |
| **PostgreSQL** | Data | Data persistence | Business logic (ให้ BE) |
| **Redis** | Cache | Session, caching | Persistence (ให้ PG) |
| **Socket.io** | RT | WebSocket events | Message reliability (ให้ DB activity log) |
| **Better Auth** | Auth | Session, RBAC | Custom permissions (ให้ app) |
| **Zod** | Validation | Input validation | Business rules (ให้ Prisma/BE) |

---

## 🔒 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: HTTPS + TLS                                        │
│ └─ Encrypt data in transit                                  │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Better Auth Sessions                               │
│ └─ Authenticate user + issue session token                  │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: tRPC protectedProcedure + Zod Validation           │
│ └─ Check auth token + validate input                        │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Prisma Queries with WHERE clauses                  │
│ └─ Filter by workspaceId (multi-tenant isolation)           │
├─────────────────────────────────────────────────────────────┤
│ Layer 5: PostgreSQL Row-Level Security (future)             │
│ └─ Database enforces access control                         │
├─────────────────────────────────────────────────────────────┤
│ Layer 6: Rate Limiting (future)                             │
│ └─ Throttle API calls per user                              │
├─────────────────────────────────────────────────────────────┤
│ Layer 7: Audit Logging                                      │
│ └─ ActivityLog tracks all mutations                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Scalability Considerations

| Concern | Current Status | Solution |
|---------|----------------|----------|
| **Concurrent Users** | 50 target | Connection pooling (PgBouncer), Redis session store |
| **Task Volume** | Up to 1000 tasks/project | Database indexing, pagination (TanStack Virtual) |
| **Real-time Events** | Socket.io broadcast | Room-based filtering (reduce payload) |
| **Database Growth** | Retention policy needed | Archive old tasks, Activity log cleanup |
| **File Storage** | Not yet implemented | S3/GCS for avatars, task attachments (future) |
| **Geographic Distribution** | Single region | CDN for static assets (Vercel auto) |

---

## 🧪 Testing Strategy by Layer

```
┌───────────────────────────────────┐
│ Unit Tests (Vitest)               │
│ ├─ lib/utils.ts                   │
│ ├─ lib/ai/prompts.ts              │
│ └─ Data transformations           │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ Integration Tests (Vitest)        │
│ ├─ tRPC routers (mock Prisma)     │
│ ├─ Socket.io event flow           │
│ └─ Auth + permissions             │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ Component Tests (React Testing)   │
│ ├─ KanbanBoard (DnD)              │
│ ├─ TaskCard rendering            │
│ └─ Form interactions              │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ E2E Tests (Playwright)            │
│ ├─ Register → Login flow          │
│ ├─ Create project → Task → Drag   │
│ ├─ Invite member → Notify         │
│ ├─ AI chat streaming              │
│ └─ Real-time updates              │
└───────────────────────────────────┘
```

---

## 🎁 Dependency Map (What uses what)

```
Components/
  ├─ kanban-board.tsx
  │   ├─ uses @dnd-kit (drag-and-drop)
  │   └─ calls tRPC tasks.move()
  │       └─ updates Prisma Task
  │
  ├─ chat-panel.tsx
  │   ├─ calls tRPC ai.chat()
  │   └─ streams SSE response
  │
  └─ notification-bell.tsx
      ├─ listens Socket.io "notification:*"
      ├─ calls tRPC notifications.markRead()
      └─ TanStack Query refetch

hooks/
  ├─ use-socket.ts
  │   └─ Socket.io client (lazy load)
  │
  └─ use-trpc.tsx
      └─ TanStack Query wrapper

lib/
  ├─ trpc/
  │   ├─ router.ts (aggregates all routers)
  │   └─ routers/
  │       ├─ tasks.ts (CRUD + move)
  │       ├─ projects.ts
  │       ├─ notifications.ts
  │       └─ ai.ts (Claude integration)
  │
  ├─ ai/
  │   ├─ client.ts (Anthropic SDK)
  │   ├─ context-builder.ts (Prisma queries)
  │   └─ prompts.ts (system prompt)
  │
  ├─ auth/
  │   └─ Better Auth config
  │
  └─ db/
      ├─ prisma.ts (singleton)
      └─ redis.ts (singleton)
```

---

## 🚨 Bottlenecks & Optimizations

| Bottleneck | Why | Fix |
|-----------|-----|-----|
| **N+1 queries** | Load all tasks + assignees separately | Use `.include({ assignees: true })` in Prisma |
| **Kanban render lag** | Re-render 1000 tasks on drag | Virtualize with TanStack Virtual |
| **Socket.io broadcast** | Send huge payloads to all users | Room-based + compress payload |
| **Session lookup** | Query DB every request | Redis session store (Better Auth feature) |
| **AI response latency** | Claude takes 3-5 sec | Stream response (SSE) → show incrementally |
| **Cold start (Vercel)** | Function warmup delay | Keep-alive pings, regional lambdas |

---

## 📚 Mental Model (How to think about the system)

```
DevMind = Multi-tenant SaaS

Frontend: React renders what user sees + talks to backend via tRPC
Backend: Node.js processes business logic + guards access + queries DB
Database: PostgreSQL stores all state (single source of truth)
Realtime: Socket.io notifies all connected clients when state changes
Cache: Redis speeds up repeated queries + holds sessions
AI: Claude adds intelligence (chat with project context)

Architecture pattern: Clean separation of concerns
- Frontend: UI + state (TanStack)
- Backend: API + validation (tRPC + Zod) + business logic (Prisma)
- Database: Data persistence + transactions
- Realtime: Event broadcast (Socket.io)
- Monitoring: Activity audit trail (ActivityLog table)

Security: Layered (HTTPS → Auth → Validation → DB filtering)
Performance: Caching + indexing + pagination + streaming

Deployment: Frontend on Vercel, Backend on same, DB on Postgres Cloud, Cache on Redis Cloud
```

---

**ความหมายสั้น ๆ:**
- **Frontend** = อะไรที่ user เห็น (React)
- **Backend** = logic ที่ไม่เห็น (Node.js + tRPC)
- **Database** = truth (PostgreSQL)
- **Cache** = fast read (Redis)
- **Realtime** = instant updates (Socket.io)
- **AI** = smart (Claude)

