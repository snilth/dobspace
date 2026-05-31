## 1. Project Overview

**DevMind** — project management web app for developer teams with an AI chatbot that understands project context.

**Core features:** Kanban board (realtime drag-and-drop), AI Assistant (Claude API streaming), Dashboard (KPI + burndown), Realtime notifications, Sprint auto-summarize.

**Scale target:** 50 concurrent users per workspace.

## 2. Tech Stack

**Frontend:** Next.js 16.2, React 19, TypeScript 5 (strict), Tailwind CSS 4, shadcn/ui (2026)

**Backend:** tRPC v11.13, Zod v4, Socket.io v4, node-redis

**Database:** PostgreSQL 17, Prisma ORM v7.8, Redis 8

**Auth:** Better Auth v1

**AI:** Anthropic SDK — model `claude-sonnet-4-20250514`

**Infra:** Vercel (FE), Prisma Postgres (DB), GitHub Actions, Docker

## 3. Architecture

```
app/
  (auth)/           login, register
  (dashboard)/      layout + all authenticated pages
    projects/[id]/  kanban board
  api/trpc/         tRPC handler
  api/ai/chat/      Claude streaming endpoint

components/
  ui/               shadcn/ui base (do not edit)
  kanban/ chat/ dashboard/ shared/

lib/
  trpc/             init, router, routers/, client, server
  db/               prisma.ts  redis.ts  (singletons)
  ai/               client, prompts, context-builder
  auth/             Better Auth config
  socket/           server, events
  env.ts            Zod env validation
  copy.ts           all user-facing strings

prisma/  hooks/  types/  e2e/
```

**AI chat flow:** user input → `api/ai/chat` → `context-builder` (Prisma) → Anthropic SDK → SSE stream → `ChatPanel`

**Mutation flow:** client → tRPC → Zod → Prisma → PostgreSQL → Socket.io broadcast → Redis invalidate

## 4. Coding Conventions

- `strict: true` — no untyped `any`
- Prefer `type` over `interface`
- Zod schema = source of truth; derive types with `z.infer<>`
- Server Components by default — `"use client"` only when needed
- Never fetch in a Client Component — use tRPC or Server Component
- No `console.log` in production — use structured logger
- No hardcoded UI strings — all copy in `lib/copy.ts`
- No business logic in `app/` — belongs in `lib/`
- No Prisma queries in components — always through tRPC router
- Split components exceeding 150 lines

**Naming:** components `PascalCase` · hooks `useXxx` · files/folders `kebab-case` · constants `SCREAMING_SNAKE_CASE`

## 5. UI & Design System

- Import from `components/ui/` only — never `@radix-ui` directly
- Add components via `npx shadcn add <component>` — never hand-edit `components/ui/`
- No `tailwind.config.js` — theme in `app/globals.css` via `@theme`
- All custom colors use OKLCH
- Class order: layout → sizing → spacing → typography → color → state

## 6. Content & Copy

- All user-facing strings in `lib/copy.ts` — no inline literals in components
- Tone: friendly, direct, always actionable
- Error messages: non-blaming, always suggest a next step

## 7. Testing & Quality

**Stack:** Vitest + Testing Library · Playwright (E2E) · `tsc --noEmit` in CI

**Coverage:** tRPC routers ≥ 80% · `lib/utils.ts` ≥ 90% · components ≥ 60% · E2E critical flows 100%

**Required E2E flows:** register→login→create project→task→move · invite member · AI chat streaming · task notification

- Test files `*.test.ts` co-located with source; E2E in `e2e/` at root
- No `test.only` / `describe.only` in commits

## 8. Commands

```bash
pnpm install
docker compose up -d               # PostgreSQL + Redis
pnpm prisma migrate dev
pnpm prisma generate
pnpm dev

pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm typecheck

pnpm prisma migrate dev --name <name>
pnpm prisma migrate reset          # dev only
pnpm prisma db seed
npx prisma postgres link           # production

pnpm build && pnpm start
docker build -t devmind:latest .
docker compose -f docker-compose.prod.yml up -d
```

## 9. Safety Rules (AI Chatbot)

- Never send raw DB schema to Claude API — serialized context summary only
- Always use `buildSystemPrompt()` from `lib/ai/prompts.ts` — no inline prompt construction
- Escape all user input before interpolating into prompts
- Max message length: 2,000 characters per request
- Rate limit AI endpoint: 20 req/min per user

*Last updated: May 2026 · Next.js 16.2 · React 19 · Prisma 7 · Better Auth v1*