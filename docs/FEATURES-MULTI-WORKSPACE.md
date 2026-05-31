# DevMind — Multi-Workspace + Advanced Assignment + Deadline Management

**เอกสารนี้กำหนด features ชุดใหญ่สำหรับการใช้งานจริงกับหลาย teams**

**เขียนเมื่อ:** 30 พ.ค. 2026  
**สถานะ:** Design (pending team approval)

---

## 📋 ภาพรวม

ระบบ DevMind จะรองรับ **5 workspaces แยกต่างหาก** (5 teams × 5-10 คน) โดยแต่ละ workspace มี:
1. **Multi-level Deadline** (Sprint + Task)
2. **Job Role Assignment** (PM, Dev, QA, Designer, etc.)
3. **Activity-Driven Notifications** (real-time alerts on changes)
4. **Audit Trail** (ประวัติการเปลี่ยนแปลง + compliance)

---

## 🏗️ โครงสร้างข้อมูล (Data Model)

### Workspace (ปัจจุบัน ✅)
```
Workspace {
  id: UUID
  name: string (e.g., "Backend Team", "Design Team")
  ownerId: UUID (FK User)
  createdAt, updatedAt
}
```

### WorkspaceMember (ปัจจุบัน ✅ + ขยาย)
```
WorkspaceMember {
  id: UUID
  workspaceId: UUID (FK)
  userId: UUID (FK)
  
  // RBAC Level (governance)
  role: enum [OWNER, ADMIN, MEMBER, VIEWER]
  
  // NEW: Job Role Level (operational)
  jobRoleId: UUID? (FK JobRole) ← nullable for backward compat
  
  createdAt, updatedAt
}
```

### 🆕 JobRole (ใหม่)
```
JobRole {
  id: UUID
  workspaceId: UUID (FK)
  name: string (e.g., "Project Manager", "Developer", "QA")
  description: string? (optional)
  color: string? (hex code for UI badges, e.g., "#3B82F6")
  
  // Metadata
  createdBy: UUID (FK User)
  createdAt, updatedAt
  
  // Indexes
  UNIQUE(workspaceId, name) ← one name per workspace
}
```

### Task (ปัจจุบัน ✅ + ขยาย)
```
Task {
  // existing fields...
  
  // NEW: Deadline
  dueDate: DateTime? (nullable, format: ISO 8601)
  
  // Status tracking
  createdAt, updatedAt, deletedAt?
}
```

### Sprint (ปัจจุบัน ✅ + ขยาย)
```
Sprint {
  // existing fields...
  
  // NEW: Deadline
  dueDate: DateTime? (nullable)
  
  updatedAt
}
```

### 🆕 TaskAssignee (ใหม่ — ติดตามการ assign)
```
TaskAssignee {
  id: UUID
  taskId: UUID (FK Task)
  userId: UUID (FK User, the person assigned)
  jobRole: string? (snapshot of role at assignment time)
  
  // Metadata
  assignedBy: UUID (FK User, who assigned)
  assignedAt: DateTime
  
  // Indexes
  UNIQUE(taskId, userId) ← one assignment per task-user pair
  (taskId) ← find all assignees for task
}
```

### 🆕 ActivityLog (ใหม่ — ประวัติการเปลี่ยนแปลง)
```
ActivityLog {
  id: UUID
  workspaceId: UUID (FK)
  
  // Entity info
  entityType: enum [Task, Sprint, Project, Member]
  entityId: UUID (the thing that changed)
  
  // Change info
  action: enum [created, updated, assigned, commented, deleted]
  userId: UUID (FK User, who did it)
  
  // JSON delta (before → after)
  changes: JSON {
    field: "status" | "dueDate" | "priority" | ...
    before: any
    after: any
  }[]
  
  // Context
  createdAt: DateTime
  
  // Indexes
  (workspaceId, entityType, entityId) ← find changes for entity
  (workspaceId, createdAt DESC) ← recent activity feed
}
```

### 🆕 NotificationPreference (ใหม่ — ตั้งค่า alert)
```
NotificationPreference {
  id: UUID
  userId: UUID (FK User)
  workspaceId: UUID (FK Workspace)
  
  // Event type settings
  eventTypes: JSON {
    assigned: boolean = true (ติดตามเมื่อ assign ให้ฉัน)
    status_changed: boolean = true (status เปลี่ยน)
    priority_changed: boolean = true (priority เปลี่ยน)
    due_date_changed: boolean = true (deadline เปลี่ยน)
    commented: boolean = true (มีคนตอบ comment)
    mentioned: boolean = true (tag ชื่อฉัน)
  }
  
  // Deadline alert settings
  deadline_approaching: {
    enabled: boolean = true
    hours_before: int = 24 (แจ้งเมื่อใกล้ 1 วัน)
  }
  
  deadline_overdue: {
    enabled: boolean = true
    interval: enum [once, daily] = daily
  }
  
  createdAt, updatedAt
}
```

---

## 🔄 Flow: ระบบการทำงาน

### Flow 1: User สร้าง Workspace + อเชิญ Members

```
┌─────────────────────────────────────────────────────────────┐
│ User A (OWNER)                                              │
│ 1. สร้าง Workspace "Backend Team"                             │
│ 2. กำหนด Workspace ได้ JobRoles: PM, Dev, QA               │
│ 3. Generate invite link (token)                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ tRPC workspace.create()                                     │
│ ✓ Create Workspace                                          │
│ ✓ Create WorkspaceMember (User A as OWNER)                 │
│ ✓ Create 3 default JobRoles (PM, Dev, QA)                 │
│ ✓ Create InviteToken                                       │
│ ✓ Socket.io broadcast: workspace:created                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ User B (New member)                                         │
│ 1. Click invite link                                        │
│ 2. Create/login account                                     │
│ 3. Redeem token → add to workspace                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ tRPC workspace.joinViaInvite(token)                        │
│ ✓ Verify token (not expired, not used)                     │
│ ✓ Create WorkspaceMember (User B as MEMBER)                │
│ ✓ Delete/mark token as used                                │
│ ✓ Create ActivityLog (action: member_added)                │
│ ✓ Socket.io broadcast: member:joined                       │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: ADMIN Assign Job Role to Member

```
┌─────────────────────────────────────────────────────────────┐
│ User A (ADMIN in workspace)                                 │
│ 1. Go to Members page                                       │
│ 2. Click User B → Select "Developer" role                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ tRPC workspace.assignJobRole(userId, jobRoleId)            │
│ ✓ Check permission (caller is ADMIN+)                      │
│ ✓ Update WorkspaceMember.jobRoleId                         │
│ ✓ Create ActivityLog (action: role_assigned)               │
│ ✓ Socket.io broadcast: member:roleChanged                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Notification sent to User B:                                │
│ "Your role in Backend Team changed to Developer"           │
│ (via Socket.io + in-app bell)                              │
└─────────────────────────────────────────────────────────────┘
```

### Flow 3: Create Task + Set Deadline

```
┌─────────────────────────────────────────────────────────────┐
│ User A (in project)                                         │
│ 1. Click "Create Task"                                      │
│ 2. Fill form:                                               │
│    - Title: "Fix login bug"                                │
│    - Assign to: User B (Developer)                         │
│    - Due date: 2026-06-05 17:00                            │
│    - Priority: HIGH                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ tRPC tasks.create()                                         │
│ ✓ Validate: dueDate is future                              │
│ ✓ Create Task { dueDate: "2026-06-05T17:00:00Z" }          │
│ ✓ Create TaskAssignee { userId: B, assignedBy: A }         │
│ ✓ Create ActivityLog (action: created + assigned)          │
│ ✓ Socket.io emit "task:created"                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Broadcast to workspace members in project:                  │
│ - User B sees: Task card in BACKLOG with deadline badge   │
│ - User A sees: Task created notification                  │
│                                                             │
│ Notification to User B:                                     │
│ "You've been assigned: Fix login bug (due Jun 5)"          │
│ (Socket.io → in-app bell)                                  │
└─────────────────────────────────────────────────────────────┘
```

### Flow 4: Drag Task → Status Changed → Activity + Notification

```
┌─────────────────────────────────────────────────────────────┐
│ User B (assigned task)                                      │
│ 1. Click "Fix login bug" (BACKLOG)                         │
│ 2. Drag to "IN_PROGRESS"                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ tRPC tasks.move(taskId, newStatus)                         │
│ ✓ Update Task.status = IN_PROGRESS                         │
│ ✓ Create ActivityLog {                                      │
│   action: updated                                           │
│   changes: [{ field: "status", before: "BACKLOG", ... }]   │
│ }                                                           │
│ ✓ Socket.io emit "task:moved"                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Query: Who cares about this task?                           │
│ - Task creator (User A) ← notify                           │
│ - Task assignees (User B) ← self, no notify                │
│ - Project watchers ← future feature                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Check NotificationPreference for User A:                    │
│ - workspace.notifPrefs[A].status_changed = true? ✓         │
│                                                             │
│ Send Notification:                                          │
│ "Fix login bug: status changed to IN_PROGRESS by User B"   │
│ Socket.io → User A's client badge +1                      │
└─────────────────────────────────────────────────────────────┘
```

### Flow 5: Cron Job — Deadline Alert

```
┌─────────────────────────────────────────────────────────────┐
│ Every 5 minutes (cron job)                                  │
│ SELECT tasks WHERE                                          │
│   dueDate BETWEEN now() AND now() + 24 hours               │
│   AND status != DONE                                        │
│   AND NOT alreadyNotified (use ActivityLog)                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ For each task:                                              │
│ 1. Find assignees                                           │
│ 2. For each assignee:                                       │
│    - Check NotificationPreference.deadline_approaching     │
│    - If true → create Notification (type: deadline_alert)  │
│ 3. Create ActivityLog (action: system_alert)               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Socket.io emit "notification:deadline_approaching"          │
│ Message: "Fix login bug due in 18 hours"                   │
│ Assignee sees badge + bell alert                           │
└─────────────────────────────────────────────────────────────┘
```

### Flow 6: Overdue Task — Daily Recurring Alert

```
┌─────────────────────────────────────────────────────────────┐
│ Daily at 9:00 AM (cron job)                                │
│ SELECT tasks WHERE                                          │
│   dueDate < now()                                          │
│   AND status != DONE                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ For each overdue task:                                      │
│ 1. Find assignees                                           │
│ 2. Check NotificationPreference.deadline_overdue.enabled   │
│ 3. If daily interval:                                       │
│    - Check if already notified today (ActivityLog)          │
│    - If not → create Notification (type: deadline_overdue) │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Message: "Fix login bug is 2 days overdue"                 │
│ Color: RED badge in UI                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 หลักการคิด (Design Principles)

### 1. **Event-Driven Architecture**
- ทุก mutation (create, update, delete, assign) → ทำให้เกิด ActivityLog
- ActivityLog เป็น source of truth สำหรับ notifications + audit
- ป้องกัน "missed events" ด้วยการ query log ถ้า cache miss

### 2. **Real-time ผ่าน Socket.io**
- Changes เกิด → emit socket event ในทันที
- เฉพาะ users ที่ต้องรู้ (workspace members, task stakeholders)
- Reduce polling — ประหยัด bandwidth + battery

### 3. **Notification Preference Flexibility**
- User ควบคุมได้ว่าอยากรู้เรื่องอะไร
- เก็บ preference per workspace (แต่ละ team ต่างความต้องการ)
- Default = enabled (opt-out model) ← มากขึ้นกว่า opt-in

### 4. **Audit Trail for Compliance**
- ทุก change มี log ฉบับ immutable
- ใครทำ, เมื่อไร, เปลี่ยนอะไร, ก่อนและหลัง (before/after)
- ใช้สำหรับ debugging + legal audit

### 5. **Gradual Rollout**
- jobRoleId = nullable ← existing members ไม่ต้อง break
- New workspace → auto-create default roles
- Future: extend to departments, permissions per role

---

## 📋 Clear Requirements

### ข้อกำหนด: Workspace Management
- [ ] สร้าง Workspace ได้หลายอัน (OWNER ต่อ workspace)
- [ ] Invite new members ผ่าน token link (7 วัน expiry)
- [ ] Assign RBAC role (OWNER/ADMIN/MEMBER/VIEWER) to member
- [ ] Assign Job Role (PM/Dev/QA/etc) to member
- [ ] ADMIN สามารถ remove member from workspace
- [ ] OWNER สามารถ delete workspace

### ข้อกำหนด: Job Roles
- [ ] OWNER/ADMIN สร้าง custom Job Roles ได้
- [ ] Default 3 roles: Project Manager, Developer, QA
- [ ] Rename/delete roles ได้ (soft delete for history)
- [ ] Each role มี color badge สำหรับ UI
- [ ] Unique role name per workspace

### ข้อกำหนด: Task Deadline
- [ ] Task มี optional `dueDate` field
- [ ] Set deadline เมื่อ create task
- [ ] Edit deadline ได้ anytime
- [ ] Sprint มี optional `dueDate` field
- [ ] Deadline display: "in 2 days" | "1 day ago" (human-readable)

### ข้อกำหนด: Task Assignment
- [ ] Assign task to multiple users (TaskAssignee table)
- [ ] See "assigned by" + "assigned at" timestamp
- [ ] Remove assignment ได้
- [ ] Change assignee ได้
- [ ] Show assignee avatar/name in task card

### ข้อกำหนด: Activity Logging
- [ ] Log ทุก mutation: created, updated, moved (status), assigned, commented
- [ ] Store before/after value สำหรับ fields: status, priority, dueDate, assignees
- [ ] ActivityLog query: by workspace, by entity, by user, by date range
- [ ] API endpoint: `GET /api/trpc/activityLog.list` (paginated)

### ข้อกำหนด: Notifications — Real-time Events
- [ ] Socket.io emit เมื่อ task created/updated/moved/assigned
- [ ] In-app bell notification (dropdown + unread badge)
- [ ] Notification มี: title, message, timestamp, action link
- [ ] Mark notification as read (single + mark all)
- [ ] Delete notification ได้

### ข้อกำหนด: Notifications — Deadline Alerts
- [ ] Approaching alert: เมื่อ dueDate < now + 24 hours
- [ ] Overdue alert: daily recurring เมื่อ dueDate < now
- [ ] User มี toggle สำหรับแต่ละ alert type
- [ ] Customizable: 24 hours → 48 hours (user setting)

### ข้อกำหนด: Notifications — Activity Change Alerts
- [ ] Alert เมื่อ assigned ให้ me
- [ ] Alert เมื่อ status changed (task ที่ฉัน assign/create)
- [ ] Alert เมื่อ priority changed
- [ ] Alert เมื่อ deadline changed
- [ ] Alert เมื่อ commented (mention)
- [ ] User customize แต่ละ event type ได้

### ข้อกำหนด: Notification Preferences UI
- [ ] Page: `/dashboard/settings/notifications`
- [ ] Toggle per event type
- [ ] Deadline alert threshold slider (6-72 hours)
- [ ] Preview: "You'll be notified when..."

---

## 🗺️ Implementation Roadmap

### Phase A: Data Model + tRPC Endpoints (Week 1)
1. Migration: add JobRole, TaskAssignee, ActivityLog, NotificationPreference tables
2. tRPC endpoints:
   - `workspace.assignJobRole(userId, jobRoleId)`
   - `workspace.createJobRole(name, color)`
   - `tasks.create` → modified to accept dueDate + assignees
   - `tasks.move` → log activity
   - `activityLog.list(workspaceId, filters)`
   - `notificationPreference.get() / update()`
3. Prisma migrations + seed

### Phase B: Real-time Socket.io Events (Week 2)
1. Emit socket events on mutations:
   - `task:created`, `task:updated`, `task:moved`, `task:assigned`
   - `member:joined`, `member:roleChanged`
2. Notification broadcast logic
3. Tests: Socket.io integration tests

### Phase C: Frontend Components (Week 2-3)
1. Members page: assign job roles + remove
2. Task create dialog: add dueDate + multi-assignee selector
3. Task card: show deadline badge + assignee avatars
4. Notification preferences page
5. Activity log viewer (bonus)

### Phase D: Deadline Alerts (Cron Jobs) (Week 3)
1. Setup Bull job queue (or simple cron with node-schedule)
2. Job: approaching deadline (every 5 min)
3. Job: overdue daily (every day at 9 AM)
4. Tests: mock time + verify notifications created

### Phase E: Testing + Polish (Week 4)
1. E2E: create workspace → invite → assign roles → task with deadline → alerts
2. Performance: N+1 queries, pagination
3. Error handling: what if cron fails? → retry

---

## 🚨 Edge Cases & Mitigation

| Edge Case | Mitigation |
|-----------|-----------|
| Member invited but account not created | Invite token can be used anytime (7 day expiry) |
| Member leaves workspace mid-sprint | Tasks reassigned manually or marked unassigned |
| Deadline changed multiple times | ActivityLog captures all changes (immutable) |
| Cron job fails | Use Bull queue + retry logic + alert ops |
| User on slow connection misses socket event | Fallback: query ActivityLog on reconnect |
| Duplicate notifications | Check ActivityLog `action:deadline_alert` + `createdAt` |
| Role name collision | DB constraint UNIQUE(workspaceId, name) |
| TaskAssignee orphan (user deleted) | Soft delete + FK constraint |

---

## 📊 Database Indexes (Performance)

```sql
-- WorkspaceMember queries
CREATE INDEX idx_workspace_member_user ON WorkspaceMember(workspaceId, userId);
CREATE INDEX idx_workspace_member_role ON WorkspaceMember(workspaceId, role);

-- TaskAssignee queries
CREATE INDEX idx_task_assignee_task ON TaskAssignee(taskId);
CREATE INDEX idx_task_assignee_user ON TaskAssignee(userId);

-- ActivityLog queries
CREATE INDEX idx_activity_log_workspace ON ActivityLog(workspaceId, createdAt DESC);
CREATE INDEX idx_activity_log_entity ON ActivityLog(workspaceId, entityType, entityId);
CREATE INDEX idx_activity_log_user ON ActivityLog(userId);

-- Task deadline queries
CREATE INDEX idx_task_due_date ON Task(projectId, dueDate) WHERE dueDate IS NOT NULL;

-- Sprint deadline queries
CREATE INDEX idx_sprint_due_date ON Sprint(projectId, dueDate) WHERE dueDate IS NOT NULL;

-- Notification preference queries
CREATE INDEX idx_notification_pref_user ON NotificationPreference(userId, workspaceId);
```

---

## 🔌 API Contracts (tRPC)

### workspace.assignJobRole
```typescript
Input: {
  workspaceId: UUID
  userId: UUID
  jobRoleId: UUID
}
Output: { success: true, member: WorkspaceMember }
Error: 
  - UNAUTHORIZED (not ADMIN+)
  - NOT_FOUND (workspace, user, role)
```

### tasks.create
```typescript
Input: {
  projectId: UUID
  title: string
  description?: string
  priority?: "LOW" | "MEDIUM" | "HIGH"
  dueDate?: DateTime
  assigneeIds?: UUID[]  // new
}
Output: { 
  task: Task
  assignees: TaskAssignee[]
  activityLog: ActivityLog
}
```

### activityLog.list
```typescript
Input: {
  workspaceId: UUID
  entityType?: string
  entityId?: UUID
  userId?: UUID
  limit: int = 50
  offset: int = 0
}
Output: {
  logs: ActivityLog[]
  total: int
}
```

---

## ✅ Success Metrics

- [ ] 5 teams can independently manage their workspaces
- [ ] New member onboarding < 5 min (invite link + role assignment)
- [ ] Deadline alerts arrive within 5 min of trigger (approaching/overdue)
- [ ] Activity log zero data loss (immutable + backed up)
- [ ] Notification preference respected 100% (A/B test)
- [ ] Socket.io event delivery 99%+ (retry logic)
- [ ] Cron job success rate > 99.5% (monitoring + alerts)

---

**Next Steps:**
1. Team review & approval of design
2. Create GitHub issues from Phase A-E tasks
3. Assign owners to each phase
4. Start implementation

