# PRD — DevMind
**Project Management Web App สำหรับทีม Developer**

> เอกสารนี้สรุปข้อกำหนดผลิตภัณฑ์ทั้งหมดที่ได้จากการหารือออกแบบระบบ
> อัปเดตล่าสุด: 30 พฤษภาคม 2026

---

## สถานะปัจจุบัน (30 พ.ค. 2026)

### ✅ Phase 1 — Foundation (เสร็จแล้ว)

**Infrastructure**
- Docker Compose รัน PostgreSQL 17 + Redis 8 บน local
- Next.js 16.2.6 + React 19 + Tailwind v4 + TypeScript strict
- Prisma v7.8 + `@prisma/adapter-pg` (driver adapter pattern ของ Prisma 7)
- Migration `init` applied — schema ขึ้น DB แล้ว
- `prisma.config.ts` — connection URL แยกออกจาก schema ตาม Prisma 7 spec

**Auth**
- Better Auth v1.6 — email/password, session 7 วัน
- `/register` และ `/login` ต่อ Better Auth จริง (ไม่ใช่ mock)
- Invite link — token เก็บใน DB, expiry 7 วัน, redeem ครั้งเดียว
- RBAC roles: `OWNER` / `ADMIN` / `MEMBER` / `VIEWER`

**API Layer**
- tRPC v11.17 + TanStack Query v5
- Routers: `workspace`, `projects`, `tasks`
- `protectedProcedure` + `adminProcedure` — guard ทุก endpoint ที่ต้องการ auth
- Route handler: `/api/trpc/[trpc]` + `/api/auth/[...all]`

**Env**
- `lib/env.ts` — Zod validation ที่ startup
- `.env.local` — DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, ANTHROPIC_*

---

### 🔄 Phase 2 — Core App (ถัดไป)

Project/Task CRUD จริง + Kanban board ดึงข้อมูลจาก DB แทน mock data

---

### ⏳ ยังไม่ได้ทำ

- Phase 3: Realtime (Socket.io, live sync, notifications)
- Phase 4: AI Chatbot (Claude streaming จาก PSU endpoint)
- Phase 5: Dashboard (KPI, Burndown, Workload)

---

**หมายเหตุ Dependency:**
- kysely pin ที่ `0.28.17` (0.29.x ไม่ compatible กับ `@better-auth/kysely-adapter`)
- AI endpoint: `https://ai.psu.blue/anthropic` (PSU university account, Anthropic-compatible)
- Model: `deepseek/deepseek-chat` (default), เปลี่ยนได้ใน `.env.local`

---

## 1. ภาพรวมผลิตภัณฑ์

DevMind คือ Project Management Web Application ที่ออกแบบมาสำหรับทีม Developer โดยเฉพาะ มี AI Chatbot ที่รู้จัก context ของโปรเจกต์ช่วยวิเคราะห์งานและตอบคำถาม ตัวแอปรองรับการทำงานแบบ realtime ผ่าน WebSocket และมี Dashboard แสดงสถานะโปรเจกต์แบบภาพรวม

### เป้าหมาย MVP
- รองรับทีม 2–10 คน ใน 1 workspace
- รองรับ unlimited projects ภายใน workspace เดียว
- Scale target: 50 concurrent users ต่อ workspace

---

## 2. การตัดสินใจหลัก (Key Decisions)

| หัวข้อ                  | การตัดสินใจ                               | เหตุผล                                   |
| --------------------- | --------------------------------------- | --------------------------------------- |
| **Workspace model**   | Single workspace per install            | เรียบง่ายสำหรับ MVP, schema ไม่ซับซ้อน         |
| **Task/Backlog**      | Task อยู่ใน backlog ได้โดยไม่ต้องมี sprint    | Sprint เป็น optional บน task             |
| **Invite flow**       | Generate invite link เท่านั้น (copy-paste) | ไม่ต้องพึ่ง email provider ใน MVP           |
| **Scaffold approach** | Incremental layers (ทีละชั้น)              | ตรวจสอบแต่ละชั้นก่อนเดินหน้า ลดความเสี่ยง debug |
| **Email provider**    | ข้าม MVP — ใช้ invite link แทน            | ลด dependency, wire up ทีหลัง             |

---

## 3. Workspace & การจัดการสมาชิก

### 3.1 Workspace
- มี workspace เดียวต่อ 1 การ install
- Workspace ถูกสร้างอัตโนมัติครั้งแรกที่ผู้ใช้คนแรกลงทะเบียน (กลายเป็น `owner`)
- ไม่มีหน้าสร้าง workspace — มีให้อยู่แล้ว 1 ใบ

### 3.2 Roles & Permissions

| Role     | สิทธิ์                                                           |
| -------- | ------------------------------------------------------------- |
| `owner`  | ทุกอย่าง + ลบ workspace, จัดการ roles ทุกคน                       |
| `admin`  | สร้าง/แก้ไข/ลบ project, invite สมาชิก, จัดการ roles (ยกเว้น owner) |
| `member` | สร้าง/แก้ไขงาน, comment, เปลี่ยน status task                      |
| `viewer` | อ่านอย่างเดียว — ดูบอร์ด, dashboard, chat (ส่งข้อความไม่ได้)           |

### 3.3 Invite Flow (MVP)
1. `owner` หรือ `admin` กด "สร้าง invite link"
2. ระบบสร้าง token และเก็บใน DB พร้อม expiry 7 วัน
3. ผู้รับคลิก link → หน้า Register ที่มี token ฝังมาใน URL
4. ลงทะเบียนสำเร็จ → เข้า workspace อัตโนมัติด้วย role `member`
5. Link ใช้ได้ 1 ครั้งต่อ user (ป้องกัน token reuse)

> **หมายเหตุ:** ยังไม่ส่ง email จริง — แค่ copy link ไปแปะเอง วาง email provider ทีหลัง

---

## 4. Project & Task Management

### 4.1 Project
- สร้าง project ได้หลายโปรเจกต์ภายใน workspace
- แต่ละ project มีชื่อ, คำอธิบาย, สถานะ (`active` / `archived`)
- Project มี Kanban board เป็นของตัวเอง

### 4.2 Sprint
- Sprint เป็น optional — project ไม่จำเป็นต้องมี sprint ก็ได้
- Sprint มีชื่อ, วันเริ่ม, วันสิ้นสุด, สถานะ (`planning` / `active` / `completed`)
- มีได้หลาย sprint ต่อ project แต่ `active` ได้ครั้งละ 1 เท่านั้น

### 4.3 Task
- Task แต่ละใบสามารถ:
  - อยู่ใน **backlog** (ไม่มี sprint)
  - ถูก assign เข้า **sprint** ที่ระบุ
- **Kanban columns (ตายตัว):**
  | Column        | ความหมาย   |
  | ------------- | ---------- |
  | `backlog`     | รายการรอ   |
  | `in_progress` | กำลังดำเนินการ |
  | `review`      | รอตรวจสอบ  |
  | `done`        | เสร็จสิ้น     |
- Task มี: ชื่อ, คำอธิบาย (Markdown), priority, assignee (1 คน), due date, tags
- Drag-and-drop ข้าม column ได้ — sync realtime ทุก session ที่เปิดอยู่

### 4.4 กฎ Kanban
- Task ใน `done` เกิน 7 วัน → badge "archived" อัตโนมัติ (ยังเห็นอยู่ ไม่ซ่อน)
- ไม่จำกัดจำนวน task ต่อ column ใน MVP

---

## 5. Realtime & Notifications

### 5.1 Realtime Events (Socket.io)
| Event            | Trigger              | ผู้รับ               |
| ---------------- | -------------------- | ----------------- |
| `task:moved`     | drag task ข้าม column | ทุกคนในโปรเจกต์     |
| `task:created`   | สร้าง task ใหม่        | ทุกคนในโปรเจกต์     |
| `task:updated`   | แก้ไข task            | ทุกคนในโปรเจกต์     |
| `task:assigned`  | assign งานให้ใคร      | เฉพาะคนที่ถูก assign |
| `comment:added`  | comment ใหม่          | ทุกคนใน task นั้น    |
| `sprint:started` | เริ่ม sprint           | ทุกคนในโปรเจกต์     |

### 5.2 Notification Center
- ไอคอนกระดิ่งใน header แสดง unread count
- คลิกเพื่อดู notification list (ล่าสุด 50 รายการ)
- Mark as read ทีละใบ หรือ "mark all read"
- Notification เก็บใน DB (persistent) — ไม่หายเมื่อ refresh

---

## 6. AI Assistant (DevMind AI)

### 6.1 ความสามารถ
- Chat แบบ streaming ตอบเป็นภาษาไทย
- รู้ context ของโปรเจกต์และ sprint ปัจจุบัน:
  - จำนวน task ที่เสร็จ / ทั้งหมด
  - task ที่ถูก block
  - workload ต่อสมาชิก
- Auto-summarize เมื่อ sprint complete

### 6.2 ข้อจำกัด (Safety)
- Rate limit: 20 req/min ต่อ user
- ความยาวข้อความ: ไม่เกิน 2,000 ตัวอักษรต่อ request
- ไม่ expose raw database schema ให้ Claude API
- ส่งเฉพาะ serialized summary ของ project context

### 6.3 Context ที่ AI เห็น
```
- projectName, sprintName
- tasksDone / totalTasks
- blockedCount
- memberList พร้อม workload (จำนวน task)
```
ไม่รวม: passwords, tokens, PII, raw SQL schema

---

## 7. Dashboard & Analytics

### 7.1 Widgets
| Widget                  | ข้อมูลที่แสดง                                         |
| ----------------------- | ------------------------------------------------- |
| **KPI Bar**             | Task เสร็จ %, Blocked count, Sprint days remaining |
| **Burndown Chart**      | Ideal vs Actual progress ตลอด sprint              |
| **Workload per Member** | Bar chart แสดง task count ต่อคน                    |
| **Recent Activity**     | Timeline ของ 10 event ล่าสุดในโปรเจกต์               |

### 7.2 Scope
- Dashboard แสดงข้อมูลของ project ที่เลือกอยู่
- Burndown ใช้ sprint ที่ `active` ปัจจุบัน (ถ้าไม่มี sprint active จะแสดง placeholder)

---

## 8. Tech Stack (สรุป)

| Layer           | Technology                                                           |
| --------------- | -------------------------------------------------------------------- |
| Frontend        | Next.js 16.2, React 19, TypeScript strict, Tailwind v4, shadcn/ui    |
| API             | tRPC v11 + Zod v4                                                    |
| Realtime        | Socket.io v4                                                         |
| Database        | PostgreSQL 17 + Prisma v7                                            |
| Cache / Pub-Sub | Redis 8                                                              |
| Auth            | Better Auth v1 (RBAC built-in)                                       |
| AI              | Anthropic SDK — claude-sonnet-4-20250514                             |
| DevOps          | Docker Compose (local), Vercel (frontend), Prisma Postgres (prod DB) |

---

## 9. แผนการพัฒนา (5 Phases)

| Phase | ชื่อ         | สิ่งที่ได้                                                                                   | พึ่งพา      |
| ----- | ---------- | --------------------------------------------------------------------------------------- | --------- |
| **1** | Foundation | Next.js scaffold, Docker, Prisma schema, Better Auth, invite link, tRPC init, app shell | —         |
| **2** | Core App   | Project/Task CRUD, Kanban board, drag-and-drop                                          | Phase 1   |
| **3** | Realtime   | Socket.io, live board sync, Notification center                                         | Phase 2   |
| **4** | AI         | Chatbot streaming, context-builder, auto-summarize sprint                               | Phase 2   |
| **5** | Dashboard  | KPI, Burndown, Workload widgets, Recent activity                                        | Phase 2–4 |

> แต่ละ phase จะมี spec ย่อย → implementation plan → โค้ดของตัวเอง

---

## 10. สิ่งที่ไม่อยู่ใน MVP (Out of Scope)

- ส่ง email จริง (invite ใช้ copy link)
- Multiple workspaces
- Configurable Kanban columns (ตายตัว 4 columns)
- File attachments บน task
- Time tracking
- Mobile app
- Webhook integrations
- GitHub/Jira sync

---

*เอกสารนี้จัดทำขึ้นจากการหารือออกแบบระบบ — พฤษภาคม 2026*
