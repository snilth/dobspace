# DevMind — Production Readiness Plan

> **สถานะ:** พื้นฐานทั้งหมด ✅ เสร็จแล้ว  
> **วัตถุประสงค์:** ปรับปรุงระบบเพื่อการใช้งานจริงกับทีม  
> **อัปเดตล่าสุด:** 30 พ.ค. 2026

---

## 🎯 กลยุทธ์

ทีมพัฒนา ความเสี่ยง → คุณภาพ → ประสบการณ์ → ประสิทธิภาพ

---

## 📋 Epics & Priorities

### 1️⃣ EPIC: Testing & Quality Assurance (P0)
**เหตุผล:** ทุกฟังก์ชันนั้นจริง แต่ยังไม่มี automated tests → ความเสี่ยง regression สูง

| Task | ขอบเขต | ประมาณการ | หมายเหตุ |
|------|--------|---------|---------|
| **Unit tests** — `lib/utils.ts`, `lib/ai/prompts.ts` | Vitest + Testing Library | 2-3 วัน | ลำดับความสำคัญสูง: prompt injection, utils functions |
| **tRPC router tests** — ทั้ง 5 routers | Mock Prisma + Zod validation | 3-4 วัน | ทดสอบ auth guards, error cases |
| **Component tests** — `KanbanBoard`, `TaskCard`, `ChatPanel` | React Testing Library | 2-3 วัน | DnD interactions, async states |
| **E2E critical flows** — Playwright | Auth → Create project → Task CRUD → Drag/notify → AI chat | 4-5 วัน | ห้ามทำ test.only ใน commits |
| **Integration tests** — tRPC + Socket.io + DB | 1 container per test | 2-3 วัน | socket broadcast verification |
| **Setup CI/CD** — GitHub Actions | `tsc` + `lint` + `test:unit` + `test:e2e` | 1-2 วัน | Block merge ถ้า fail |

**Owner:** QA Lead | **Target:** Week 1-2 (June)

---

### 2️⃣ EPIC: Security Hardening (P0)
**เหตุผล:** AI endpoint + user input + real DB = ต้องป้องกัน OWASP Top 10

| Task | ขอบเขต | ประมาณการ | หมายเหตุ |
|------|--------|---------|---------|
| **Input validation** — Zod schemas ครอบคลุม | Audit `tRPC` routers, tighten regex/enum | 1-2 วัน | ป้องกัน SQL injection, XSS, prompt injection |
| **Rate limiting** — AI endpoint, auth endpoints | `ms` library + Redis | 1 วัน | 20 req/min per user (AI), 5/min (auth) |
| **CORS & CSP** — strict headers | Middleware + `next.config.ts` | 1 วัน | Whitelist origins, disable inline scripts |
| **JWT/Session hardening** — Better Auth review | Check expiry, secure flags, HttpOnly | 1 วัน | Align with OWASP session mgmt |
| **Secrets management** — `.env.local` → production | GitHub Secrets + Vercel env vars | 1 วัน | Never commit secrets |
| **Dependencies audit** — `npm audit`, known CVEs | Run regularly in CI | 1 วัน | Auto-update dev deps, manual patch for prod |
| **Audit logging** — mutations & sensitive reads | Log user, action, timestamp, IP | 2 วัน | Store in DB + S3 backup |

**Owner:** Security Lead | **Target:** Week 1-2 (June)

---

### 3️⃣ EPIC: Error Handling & Monitoring (P0)
**เหตุผล:** Production กำลังเกิดข้อผิดพลาด ← ต้องมี observability

| Task | ขอบเขต | ประมาณการ | หมายเหตุ |
|------|--------|---------|---------|
| **Structured logging** — Replace `console.log` | pino / winston + CloudWatch / Datadog | 2-3 วัน | Levels: debug, info, warn, error |
| **Error boundaries** — React error catching | `ErrorBoundary` wrapper + fallback UI | 1-2 วัน | Graceful degradation |
| **Sentry integration** — Exception tracking | DSN setup + breadcrumbs | 1-2 วัน | Real-time alerts on prod |
| **tRPC error handling** — Consistent error format | `TRPCError` with codes + messages | 1-2 วัน | Client-side retry logic |
| **Socket.io error recovery** — Disconnect handling | Auto-reconnect + queue pending events | 1 วัน | User sees "reconnecting..." state |
| **DB connection pooling** — Prevent exhaustion | PgBouncer or Prisma client params | 1 วัน | Monitor connection count |
| **API health check** — `/api/health` endpoint | Postgres + Redis ping | 1 วัน | Uptime monitoring |

**Owner:** DevOps Lead | **Target:** Week 2-3 (June)

---

### 4️⃣ EPIC: Performance Optimization (P1)
**เหตุผล:** 50 concurrent users = ต้องมี caching + efficient queries

| Task | ขอบเขต | ประมาณการ | หมายเหตุ |
|------|--------|---------|---------|
| **Query optimization** — N+1 prevention | Audit `.include()`, use dataloader | 2 วัน | Task list ต้อง eager load assignees, tags |
| **Redis caching** — Hot data | User sessions, project list, task filters | 2-3 วัน | TTL strategy: 5min (dynamic), 24h (static) |
| **Bundle optimization** — Code splitting | Analyze with `next/bundle-analyzer` | 1-2 วัน | Remove unused deps, lazy-load chat |
| **Image optimization** — User avatars, project icons | Next.js `<Image>`, WebP format | 1 วัน | Auto-resize, CDN caching |
| **Frontend pagination** — Kanban infinite scroll | TanStack Virtual instead of load-all | 2-3 วัน | Handle 1000+ tasks per project |
| **Database indexing** — Strategic indexes | `(userId, projectId)`, `(projectId, status)` | 1 วัน | Run EXPLAIN ANALYZE |
| **Socket.io optimization** — Reduce payload size | Compress events, debounce broadcasts | 1 วัน | Monitor ws memory usage |

**Owner:** Perf Lead | **Target:** Week 3-4 (June)

---

### 5️⃣ EPIC: Developer Experience (P1)
**เหตุผล:** ทีมต้องง่ายต่อการต่อพัฒนา

| Task | ขอบเขต | ประมาณการ | หมายเหตุ |
|------|--------|---------|---------|
| **Local dev setup script** — `pnpm setup:dev` | Docker Compose + seed data + env template | 1 วัน | One-liner onboarding |
| **Mock data seeding** — Realistic seed in `prisma/seed.ts` | 3 projects + tasks + notifications + chat | 1 วัน | `pnpm prisma db seed` ต้อง idempotent |
| **API mocking** — Storybook + MSW | Component stories isolated from API | 2 วัน | Develop UI offline |
| **Dev tools integration** — VS Code launch config | Debugger + terminal tasks | 1 วัน | Click "Run" to start full stack |
| **Documentation** — Contributing guide + ADRs | Setup, architecture, PR checklist | 2 วัน | `CONTRIBUTING.md` + `docs/adr/` |
| **Git hooks** — Pre-commit linting | husky + lint-staged | 1 วัน | Prevent bad commits |
| **VSCode settings** — Team config | `.vscode/settings.json` + extensions list | 0.5 วัน | Consistent formatting |

**Owner:** DX Lead | **Target:** Week 2 (June)

---

### 6️⃣ EPIC: Deployment & Infrastructure (P1)
**เหตุผล:** ต้องเตรียม staging + production

| Task | ขอบเขต | ประมาณการ | หมายเหตุ |
|------|--------|---------|---------|
| **Docker multi-stage build** — Production image | Optimized size, security scanning | 1 วัน | Use `docker-slim` or Trivy |
| **Docker Compose production** — `docker-compose.prod.yml` | Replicas, resource limits, healthchecks | 1-2 วัน | `depends_on: condition: service_healthy` |
| **Vercel deployment** — Frontend + API routes | `vercel.json` config, preview builds | 1-2 วัน | Auto-deploy on `main` branch |
| **Prisma Postgres** — Managed database | Link via `prisma postgres link` | 1 วัน | Backups, SSL certs automatic |
| **Redis hosting** — Redis Cloud or Upstash | Connection string in prod env | 0.5 วัน | Monitor key eviction rate |
| **Domain & SSL** — DNS + HTTPS | Let's Encrypt (automatic on Vercel) | 0.5 วัน | Redirect http → https |
| **Secrets management** — GitHub Secrets + CI/CD | Never log sensitive values | 1 วัน | Rotate quarterly |
| **Monitoring & alerts** — Sentry, Datadog, Uptime monitors | Threshold alerts (error rate, latency) | 1-2 วัน | On-call rotation setup |

**Owner:** DevOps + Platform Lead | **Target:** Week 3-4 (June)

---

### 7️⃣ EPIC: Documentation & Knowledge Transfer (P2)
**เหตุไม่ระบุเหตุผล:** Onboard ทีมใหม่ + future maintenance

| Task | ขอบเขต | ประมาณการ | หมายเหตุ |
|------|--------|---------|---------|
| **Architecture Decision Records** — ADRs | Why tRPC? Why Socket.io? Why Prisma? | 1-2 วัน | `docs/adr/001-trpc-choice.md` |
| **API documentation** — tRPC endpoint reference | Auto-gen from Zod schemas | 1 วัน | Typedoc + custom markdown |
| **Database schema diagram** — Visual ER diagram | Prisma studio + mermaid diagram | 1 วัน | Include in `CLAUDE.md` |
| **Runbook** — Ops playbook | How to deploy, rollback, scale, debug | 2 วัน | Troubleshooting guide |
| **Security checklist** — Pre-launch audit | OWASP Top 10 verification | 1 วัน | Sign-off required |
| **Glossary** — Domain terminology | "Sprint", "Task", "Project", "Workspace" | 1 วัน | Share understanding with non-tech |

**Owner:** Tech Lead + PM | **Target:** Week 2-3 (June)

---

## 🗓️ Timeline & Milestones

```
Week 1 (June 3–7)
├─ P0: Testing setup + first unit tests
├─ P0: Security audit + rate limiting
└─ P0: Logging framework

Week 2 (June 10–14)
├─ Continue testing (E2E flows)
├─ DX improvements (setup script, docs)
├─ Error boundaries + Sentry
└─ ADRs & architecture docs

Week 3 (June 17–21)
├─ Query optimization + caching
├─ Docker Compose prod
├─ Database indexing
└─ Runbook draft

Week 4 (June 24–28)
├─ Final E2E testing
├─ Vercel + database deployment
├─ Load testing (50 concurrent users)
├─ Security checklist sign-off
└─ **PROD LAUNCH** 🚀
```

---

## ⚠️ Risk & Mitigation

| ความเสี่ยง | ความรุนแรง | การบรรเทา |
|-----------|----------|---------|
| Test coverage gaps → regression | สูง | Use coverage tools, `--coverage` threshold |
| Production secret leaks | วิกฤต | Rotate secrets weekly, audit logs |
| Socket.io memory leak @ scale | สูง | Load test 100 concurrent, profile heap |
| Slow query @ 1000 tasks | ปานกลาง | Index + pagination early |
| AI prompt injection attacks | สูง | Zod validation + system prompt hardening |
| Database migration downtime | ปานกลาง | Zero-downtime migration strategy (blue-green) |
| Team knowledge silos | ปานกลาง | Pair programming, docs-first culture |

---

## 📊 Success Criteria

- [ ] ✅ **Test coverage**: `lib/` ≥ 90%, `tRPC` ≥ 80%, `components/` ≥ 60%
- [ ] ✅ **No OWASP Top 10 findings** in security audit
- [ ] ✅ **All critical flows pass E2E tests** (register → task → notify → chat)
- [ ] ✅ **Latency p95 < 500ms** under 50 concurrent users
- [ ] ✅ **Zero unhandled exceptions** in staging (1 week)
- [ ] ✅ **Error rate < 0.1%** first week of prod launch
- [ ] ✅ **100% uptime SLA** (99.9% is acceptable)
- [ ] ✅ **New dev onboarding < 30 min** (end-to-end)
- [ ] ✅ **All docs reviewed & signed off** by tech leads

---

## 🚀 Go-Live Checklist

Before production deployment:

- [ ] **Security** — Penetration test passed, secrets not in code
- [ ] **Database** — Backups configured, failover tested
- [ ] **Monitoring** — Sentry + Datadog dashboards live, alerts configured
- [ ] **Performance** — Load test results documented, p95 < 500ms
- [ ] **Testing** — 100% critical E2E flows passing
- [ ] **Docs** — Runbook, ADRs, API docs complete
- [ ] **Team** — All members trained on deployment procedure
- [ ] **Rollback** — Disaster recovery plan written & tested

---

## 📝 Notes for Team Discussion

1. **Testing** — ต้องหารือว่า E2E scope (ทั้ง 5 flows หรือ just core 3?)
2. **Performance baseline** — มี load test tool แล้วไหม? (k6, Locust, JMeter)
3. **Monitoring stack** — Sentry ฟรี + Datadog trial? หรือ self-hosted ELK?
4. **Database backup** — ต้องการ 30 วัน retention หรือ 7 วัน?
5. **Support model** — ใครต้องติดหลังการ launch?
6. **Rollback strategy** — Feature flags ต้องไหม?

---

**Next:** Schedule team alignment meeting to vote on priorities & assign owners.
